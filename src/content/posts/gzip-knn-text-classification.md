---
title: "gzip is all you need (gzip + kNN outperforms Transformers)"
author: "Bomin Chuang"
date: "2023-08-15"
description: "Notes on parameter-free text classification with gzip compression and k-nearest neighbors."
tags:
  - "Natural Language Processing"
---

## Abstract

[“Low-Resource” Text Classification: A Parameter-Free Classification Method with Compressors (Jiang et al., ACL Findings 2023)](https://aclanthology.org/2023.findings-acl.426.pdf)

大多數神經網絡對 data 的需求很高，這種需求隨著模型參數數量的增加而增加。

在眾多模型中，Deep Neural Networks（DNN）由於準確率高，因此常被用來進行文本分類。然而，DNN 是計算密集型的；在實踐中使用和優化這些模型，以及遷移到 Out-of-Distribution（OOD）的成本非常高。

針對這一缺陷，這篇論文提出了一種文本分類方法，將 $gzip$ 與 $k$NN 結合。

採用這種方法，在沒有任何訓練參數的情況下，作者在七個分布內數據集和五個分布外數據集上的實驗表明：使用像 $gzip$ 這樣的簡單壓縮器，七個數據集中的六個結果可與 DNN 結果相當，並在五個 OOD datasets 上勝過包括 BERT 在內的所有方法。即使在 few-shot setting 下，方法也大幅超越了所有模型。

## Introduction

在為 DNN 提供更輕替代方案的所有努力中，有幾篇論文側重於使用壓縮器進行文本分類。其核心想法是：文檔和壓縮器構建的類語言模型之間的最小 cross entropy 可指示文檔的類別。然而，以前的研究未能與神經網絡的準確度相匹配。

這篇論文的貢獻如下：

1. 第一個使用 NCD 和 $k$NN 進行主題分類，使能夠使用基於壓縮器的方法在大型數據集上進行全面的實驗。
2. 方法在七個分布內數據集中的六個上取得了與非預訓練 DNN 相當的結果。
3. 在 OOD datasets 上，表明該方法優於所有方法，包括 BERT 等預訓練模型。
4. 在 scarce labeled data 的 few-shot setting 中表現出色。

## Approach

作者使用 compressor 進行壓縮源於兩個直覺：

1. Compressors 擅長捕捉規律。
2. 同一類別的對象比不同類別的對象具有更多規律性。

For example:

下面的 $x_1$ 與 $x_2$ 屬於同一類別，但與 $x_3$ 屬於不同類別。如果我們用 $C(\cdot)$ 來表示壓縮長度，會發現：

$$C(x_1x_2) - C(x_1) < C(x_1x_3) - C(x_1)$$

其中 $C(x_1x_2)$ 表示 $x_1$ 和 $x_2$ 串聯的壓縮長度。

$$x_1 = \text{Japan’s Seiko Epson Corp. has developed a l2-gram flying microbot.}$$

$$x_2 = \text{The latest tiny flying robot has been unveiled in Japan.}$$

$$x_3 = \text{Michael Phelps won the gold medal in the individual medley.}$$

![Compression-distance intuition](https://imgur.com/uz4edvt.jpg)

由於柯氏複雜性（Kolmogorov complexity）的不可計算性，$E(x, y)$ 不可計算。因此 Li et al. 在 2004 年的論文 *The Similarity Metric* 中提出資訊距離的歸一化、可計算版本：Normalized Compression Distance（NCD）。它利用壓縮長度 $C(x)$ 近似柯氏複雜性 $K(x)$：

$$
NCD(x, y) = \frac{C(xy) - \min\{C(x), C(y)\}}{\max\{C(x), C(y)\}}
$$

$x$ 和 $y$ 是需要比較的兩個檔案；$C$ 指壓縮；$C(xy)$ 就是將 $x$ 與 $y$ 放進一個壓縮包中的 byte 大小；$C(x)$ 與 $C(y)$ 則是各自單獨壓縮後的大小。

NCD 的原理是：如果兩個二進制檔案非常相似，共同壓縮後重疊的部分會很多，因此壓縮後的 byte 大小會越小。假如是兩個完全相同的二進制檔案，它們共同壓縮後的體積應該和單獨壓縮一個檔案的體積一樣大：

$$\text{Idempotency: } C(xx) = C(x)$$

由於主要實驗結果使用 $gzip$ 作為壓縮器，這裡的 $C(x)$ 表示 $x$ 經過 $gzip$ 壓縮後的長度；$C(xy)$ 是連接 $x$ 和 $y$ 後的壓縮長度。有了 NCD 提供的距離矩陣，就可以使用 $k$NN 進行分類。

### 14 lines of Python code for implementing this idea

The inputs are `training_set`, `test_set`—both arrays of `(text, label)` tuples—and $k$.

```python
# Python code for text classification with gzip
import gzip
import numpy as np

for x1, _ in test_set:
    Cx1 = len(gzip.compress(x1.encode()))
    distance_from_x1 = []

    for x2, _ in training_set:
        Cx2 = len(gzip.compress(x2.encode()))
        x1x2 = " ".join([x1, x2])
        Cx1x2 = len(gzip.compress(x1x2.encode()))
        ncd = (Cx1x2 - min(Cx1, Cx2)) / max(Cx1, Cx2)
        distance_from_x1.append(ncd)

    sorted_idx = np.argsort(np.array(distance_from_x1))
    top_k_class = training_set[sorted_idx[:k], 1]
    predict_class = max(set(top_k_class), key=top_k_class.count)
```

## Experiment

### Dataset

![Dataset table](https://imgur.com/MPQJ2QM.jpg)

### Model

提案手法的結果與兩類方法比較：

1. 需要訓練的神經網絡方法。
2. 直接使用 $k$NN 的非參數方法。

比較同時考慮是否對外部數據進行 pre-training。

作者也比較其他三種使用 $k$NN 的非參數方法：word2vec、SentBERT 和 TextLength。

![Model comparison table](https://imgur.com/ozIJ8uZ.jpg)

## Result

### Result on in-distribution Datasets

1. 作者在下方 Table 3 的七個數據集上訓練所有 baseline；結果顯示，$gzip$ 在 AG News、R8 和 R52 上表現得非常好。
2. 在 AG News 上，fine-tuning BERT 在所有方法中取得最佳性能，而 $gzip$ 在沒有任何預訓練情況下取得有競爭力的結果，僅比 BERT 低 0.007。
3. 在 R8 和 R52 上，唯一優於 $gzip$ 的非預訓練神經網絡是 HAN。在 YahooAnswers 上，$gzip$ 的準確率比一般神經方法低約 7%；這可能是該數據集詞彙量較大，導致壓縮器難以壓縮。
4. $gzip$ 在極大的數據集（例如 YahooAnswers）上表現不佳，但在中小型數據集上很有競爭力。

![In-distribution results](https://imgur.com/9DZTTGy.jpg)

下方 Table 4 列出所有 baseline models 的測試準確率平均值（TextLength 除外）。結果顯示，$gzip$ 在除 YahooAnswers 外的所有數據集上都高於或接近平均值。

![Average in-distribution results](https://imgur.com/3SiUFFK.jpg)

### Result on out-of-distribution Datasets

1. 在下方 Table 5 中，無需任何 pre-training 或 fine-tuning，$gzip$ 在所有數據集上優於 BERT 和 mBERT。
2. 結果表明，$gzip$ 在 OOD 數據集上優於預訓練與非預訓練深度學習方法，表示該方法在數據集分布方面具有通用性。

![Out-of-distribution results](https://imgur.com/Lhako11.jpg)

### Few-Shot Learning

作者也在少樣本設置下比較 $gzip$ 與深度學習方法，並在 AG News、DBpedia 和 SogouNews 上對非預訓練與預訓練深度神經網絡進行實驗。

如下圖所示，在三個數據集上，$gzip$ 的性能優於 shot 設為 5、10、50 的非預訓練模型。當 shot 數量 $n = 5$ 時，$gzip$ 的性能大幅優於非預訓練模型。其中在 AG News 5-shot 設置下，$gzip$ 的準確率比 fastText 高出 115%。

此外，在 100-shot 設置下，$gzip$ 在 AG News 和 SogouNews 上的表現也優於非預訓練模型，但在 DBpedia 上的表現稍差。

![Few-shot in-distribution results](https://imgur.com/cNpRPnS.jpg)

作者進一步在五個 OOD 數據集上研究 5-shot 設置下 $gzip$ 與 DNN 方法的比較。結果顯示，$gzip$ 大大優於所有深度學習方法；在相應 dataset 中，該方法比 BERT 準確率分別增加 91%、40%、59%、58% 和 194%，比 mBERT 準確率分別增加 100%、67%、40%、12% 和 130%。

![Few-shot OOD results](https://imgur.com/jb96Ion.jpg)

## Limitation

由於 $k$NN 的 computation complexity 為 $O(n^2)$，當數據集變得非常大時，速度是這個方法的限制之一。但可透過 multi-threads 和 multi-processes 大幅提高速度。

## Reference

1. [npc_gzip GitHub repository](https://github.com/bazingagin/npc_gzip)
