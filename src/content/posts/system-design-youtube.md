---
title: "System Design - YouTube"
author: "Bomin Chuang"
date: "2023-04-09"
description: "Notes on designing a large-scale video platform, covering requirements, capacity estimation, APIs, storage, and scalability."
tags:
  - "system design"
---


## Step 1: Clarify the requirements 了解系統需求

- Feature Requirements
- Traffic/User size（例如 Daily Active User）服務流量的大小

Nobody expects you to design a complete system in 30–45 minutes.

Align with interviewers on 2–3 components to focus on in the interview.

### 系統設計面試重點：要和面試官達成一致

## Type 2: Non-Functional Requirement

為了保證 Availability 犧牲了 Consistency。設計重點：系統面對比較大流量時的 Scalability 和 Low Latency。

- Consistency
  - Every read receives the most recent write or an error.
  - Trade-off with Availability: Eventual consistency（最終一致性）。
- Availability
  - Every request receives a non-error response, without the guarantee that it contains the most recent write.
  - Scalable
    - Performance: low latency（because it is watching video）。
- Partition tolerance（Fault Tolerance）系統的容錯性
  - The system continues to operate despite an arbitrary number of messages being dropped (or delayed) by the network between nodes.

## Step 2: Capacity Estimation

Why Capacity Estimation?

- Evaluate a candidate’s analytical skills and system sense.
- Helpful for identifying system bottlenecks in order to improve system scalability.

![Capacity estimation diagram](https://i.imgur.com/6yHnqfO.png)

![Storage estimation diagram](https://i.imgur.com/MYKbKk2.png)

Replication（數據的備份）：通常需要在一個數據中心內把數據備份三份。為了系統的可用性，同一個文件會被分佈到不同的數據中心。

這就需要 9 倍的儲存空間。

![Replication estimation diagram](https://i.imgur.com/c5IpqfV.png)

DAU = Daily Active User

## Step 3: System APIs

![System API diagram](https://i.imgur.com/2k2ugpd.png)

![Upload API diagram](https://i.imgur.com/u2qeGxA.png)

![Playback API diagram](https://i.imgur.com/zx336yM.png)

- Offset：影片的 TimeCode。
- Codec：影片的編碼格式。
- Resolution：分辨率（主要取決於頻寬的大小，用來優化觀影體驗）。

## Step 4: High-level System Design

![High-level system design](https://i.imgur.com/Nbm5C9K.png)

Metadata：影片的標題、描述等。

影片本身會存到 Distributed Media Storage。

上傳的影片需要經過轉碼處理成不同格式和分辨率的視頻，因此需要異步處理（using a Processing Queue）。

Video Processing Service：將處理完的影片跟縮略圖存放到文件系統，同時在 metadata 數據庫當中更新影片跟縮圖的存放地址。

For lower latency: CDN（push data to the server that is closer to the user）。

Video Distributing Service：負責將影片和圖片分發到 CDN 的各個節點上。

Completion Queue：異步處理，當處理完之後往這個隊列添加任務。

![Video processing flow](https://i.imgur.com/mAuqcms.png)

1. 下載影片，然後把一個影片分成小片段。
2. 對影片解碼再編碼（將影片變成不同的格式和分辨率）。
3. 提取影片縮略圖。
4. 用 ML 算法來做 video content understanding。

![Video distribution flow](https://i.imgur.com/LP4lUhv.png)

一般熱門的影片會從 CDN 上 stream 給用戶；冷門的視頻則由原 Data Center stream to user。

## Scenario 2

![Video playback architecture](https://i.imgur.com/iDGdoNP.png)

Video Playback Service：主要用來負責影片播放。

Host Identify Service：用來對影片的地址進行查找。也就是給定一個 video、user 的 IP 地址，以及用戶的設備信息，查找離這個用戶最近且儲存有這個影片的 CDN 位置。

如果找到了就把位置回傳給用戶，用戶就可以觀看影片；沒有找到就從 Data Center 找影片給用戶觀看。

Metadata/User：從數據庫直接讀取影片的標題、描述等。

## Step 5: Data Storage

PK = primary key

![Data storage schema](https://i.imgur.com/k8KQ0vp.png)

![Data storage design](https://i.imgur.com/4SO73cJ.png)

## Step 6: Scalability

![Scalability diagram](https://i.imgur.com/dULCFRN.png)

找出系統瓶頸，然後提出解決方案和優缺點分析。

![Replication scalability diagram](https://i.imgur.com/bZ2vUyu.png)

解決方案：把數據進行多份拷貝分發到不同的機器上，這樣多台機器就能 serve 不同的 requests。

![Primary-secondary replication](https://i.imgur.com/aDegcGf.png)

![Replication trade-offs](https://i.imgur.com/RUupduh.png)

常見的方法：使用 primary-secondary。

Pros:

- Availability：隨時都可以讀數據，而不用被寫操作影響。

Cons:

- 用戶不一定能讀到最新的數據（對用戶沒有多大影響）。

## Optimization 3: Caching

![Caching diagram](https://i.imgur.com/AHZpjio.png)

## Netflix Example: Put Cache in ISP

![Netflix cache in ISP](https://i.imgur.com/rmKp5Ki.png)

## CDN

![CDN diagram](https://i.imgur.com/202Ecg5.png)

## Reference

[花花醬 YouTube](https://www.youtube.com/c/HuaHuaLeetCode/videos)
