---
title: "Encoder-based言語モデルによるテキスト生成：RoBERTa Diffusionの実装と検証"
author: "Bomin Chuang"
date: "2025-12-22"
description: "RoBERTaのMasked Language Modelingを用いたテキスト拡散モデルの実装と、per-batch・per-sampleマスク戦略の比較。"
tags:
  - "自然言語処理"
  - "NLP"
  - "gpt"
  - "bert"
  - "diffusionmodel"
---

## はじめに

2017年にGoogleが発表した論文[Attention Is All You Need](https://arxiv.org/abs/1706.03762)以降、Transformerアーキテクチャは自然言語処理の基盤となりました。その後、エンコーダとデコーダはそれぞれ独立して活用できることが明らかになり、用途に応じた使い分けが進んでいます。

![Transformer architecture](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/4040043/d9feab47-94a3-4334-a44d-3187f30f5a53.png)

Decoder ベースの大規模言語モデル（Large Language Models, LLMs）は、next-token predictionを通じて学習されています。推論時には、ユーザーのプロンプトに基づき、語彙の確率分布から次のトークンを逐次選択することでテキストを生成します。

一方、BERT や RoBERTa のようなEncoder ベースのモデルは、テキスト分類や検索タスクに優れていますが、テキスト生成にはあまり向いていません。

今回は、Nathan Barry 氏の[記事](https://nathan.rs/posts/roberta-diffusion/)で紹介されている、拡散メカニズムをEncoderモデルに応用したテキスト生成手法を日本語で解説し、[公開コード](https://github.com/nathan-barry/RoBERTaDiffusion)をもとに実装します。さらに、マスク戦略（per-batch / per-sample）の違いが、生成されるテキストの品質にどのような影響を与えるかについても検証します。

## Diffusion Modelについて

Diffusion Model（拡散モデル）は生成AIモデルの一種で、特に高品質な画像や音声などのコンテンツ生成に優れています。最も有名な応用例として、Stable DiffusionやDALL-Eなどのテキストから画像を生成するシステムがあります。

### 画像における拡散モデル

画像は連続的なピクセル値で表現されるため、ガウシアンノイズを用いた拡散プロセスが適用されます：

1. **Forward Process**：クリーンな画像 $x_0$ から始め、各タイムステップでノイズを少量ずつ加え、最終的にほぼ純粋なノイズになります。
2. **Reverse Process**：各タイムステップでノイズを予測するモデル（U-Netなど）を訓練し、ステップごとにノイズを取り除き元の画像を徐々に復元します。

### テキストにおける拡散モデル

一方、テキストは離散的なトークン列で構成されるため、連続的なガウシアンノイズを直接適用することができません。そこで、最もシンプルなアプローチはmasking-based noise processです：

1. **Forward（masking）process**
   - タイムステップ $t = 0$：欠損のないテキストシーケンスからスタートします。
   - 各タイムステップ $t > 0$：定義済みのスケジュールに従い、トークンの一部をランダムに特殊な `<MASK>` トークンに置き換えます（徐々にマスク率を上げます）。
   - 最終タイムステップ $T$：シーケンス全体がマスクされた状態になります。
2. **Reverse（denoising）process**
   - 部分的にマスクされたシーケンスから、元のトークン ID を予測するようにモデル（Transformerベース）を訓練します。
   - 様々なマスク率でマスク言語モデリングを行うことに似ています。初期のタイムステップでは少数のトークンのみがマスクされ（予測が容易）、後期のタイムステップでは多くのトークンがマスクされます（予測が困難）。
   - 高いマスク率からゼロになるまで予測を chaining させることで、完全なシーケンスを生成します。

## RoBERTa Diffusion

本手法は、RoBERTaのMLM（Masked Language Modeling）を活用したシンプルなテキスト拡散モデルです。

標準的な拡散モデルでは、現在のタイムステップ $t$ の情報をモデルに明示的に入力します（timestep embedding）。これにより、モデルはノイズレベルに応じた適切な予測を学習できます。

しかし、Nathan Barry 氏の手法では、RoBERTaの事前学習済み重みをそのまま活用するため、マスク率の異なる様々なサンプルで学習することで、モデルが暗黙的にノイズレベルを推定できるようになることを期待しています。この簡略化により、既存のMLMモデルを最小限の修正でテキスト生成に転用できるというメリットがあります。

まずは、記事の公開リポジトリをクローンします。

```bash
git clone https://github.com/nathan-barry/RoBERTaDiffusion.git
```

記事の内容と少し違って、添付したコードはWikiTextデータセットではなく、OpenWebTextデータセットを使用しています。

```python
print("[INFO] Loading OpenWebText dataset...")
dataset = load_dataset("openwebtext", streaming=True, trust_remote_code=True)
```

まずOpenWebTextでRoBERTaをファインチューニングし、生成結果を確認します。

ハイパーパラメータとGPUスペック：

```python
# Hyperparameter
BATCH_SIZE: int = 16
PREFIX_LEN: int = 32
MAX_LEN: int = 256
CONFIDENCE_THRESHOLD: float = 0.9
TEMPERATURE: float = 0.8

MAX_STEPS: int = 10000
SAVE_STEPS: int = 500
LOGGING_STEPS: int = 50
```

GPU: NVIDIA GeForce RTX 4070 16GB

使用したプロンプトは記事と同じです：`Following their victory in the French and Indian War, Britain began to assert greater`

結果：

![OpenWebText generation result](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/4040043/7edb24be-988d-4ff7-aded-fb3fc8587891.png)

WikiTextデータセットに変更した場合：

![WikiText generation result](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/4040043/826c72b3-cdd2-4701-98e5-41f15d1806f6.png)

OpenWebTextデータセットは規模が大きく内容の分布も多様であるため、同じ訓練ステップ数（10kステップ）では十分に収束しにくく、同じ文が繰り返し生成される現象が発生した可能性があると考えられます。

一方、WikiTextはWikipediaを元にしており、テキスト構造がより規範的でテーマも集中しているため、生成内容はより良い叙述的一貫性を持つ傾向があるのではないかと推察されます。これらの理由に加え、Nathan Barry 氏の記事内容と一致させるため、本実験ではWikiTextデータセットを用いて訓練を行います。

## マスク戦略の比較：Per-batch vs Per-sample

リポジトリにおけるランダムなマスク確率の取得方法は、`MAX_LEN`に基づいて高から低への線形確率シーケンスを生成し、各バッチでランダムに確率 $p$ を選択し、その $p$ に基づいてどのトークンをマスクするかを決定します。

生成テキストの多様性を向上させる目的で、各サンプルごとに異なるマスク確率を与える方式（per-sample）に変更し、その影響を検証します。

以下はPer-sample Diffusion Collatorのコードです：

```python
class PerSampleDiffusionCollator:
    def __init__(
        self,
        tokenizer: RobertaTokenizerFast,
        config: Config,
    ) -> None:
        self.tokenizer = tokenizer
        self.config = config
        self.mask_probs = torch.arange(config.MAX_LEN, 0, -1).float() / config.MAX_LEN
        self.special_ids = set(tokenizer.all_special_ids)

    def __call__(self, features: list[dict]) -> dict[str, torch.Tensor]:
        texts = []
        for f in features:
            if isinstance(f, dict):
                texts.append(f.get("text", f.get("content", "")))
            else:
                texts.append(f["text"] if "text" in f else str(f))

        encoded = self.tokenizer(
            texts,
            max_length=self.config.MAX_LEN,
            truncation=True,
            padding="max_length",
            return_tensors="pt",
        )
        batch_input_ids = encoded["input_ids"]
        batch_attention = encoded["attention_mask"]
        labels = batch_input_ids.clone()

        B, L = batch_input_ids.shape
        mask_ratios = self.mask_probs[torch.randint(0, len(self.mask_probs), (B,))]

        is_special = torch.zeros_like(batch_input_ids, dtype=torch.bool)
        for sid in self.special_ids:
            is_special |= batch_input_ids == sid

        pos_idxs = torch.arange(L).unsqueeze(0).expand(B, L)
        is_prefix = pos_idxs < self.config.PREFIX_LEN
        mask_candidate = (batch_attention == 1) & (~is_special) & (~is_prefix)

        rand = torch.rand_like(batch_input_ids, dtype=torch.float)
        mask_positions = rand < mask_ratios.unsqueeze(1)
        mask_positions &= mask_candidate

        batch_input_ids[mask_positions] = self.tokenizer.mask_token_id
        labels[~mask_positions] = -100

        return {
            "input_ids": batch_input_ids,
            "attention_mask": batch_attention,
            "labels": labels,
        }
```

### 実験結果

Per-batch:

![Per-batch result](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/4040043/8754fdac-bd40-4477-ab79-d16ba767c125.png)

Per-sample:

![Per-sample result](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/4040043/723156da-5f73-41bd-be60-2d2e3e1b0a6e.png)

### 結果分析

予想に反して、per-sample方式はper-batch方式よりも生成品質が低下しました。

<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>観点</th>
        <th>Per-batch</th>
        <th>Per-sample</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>内容の多様性</td>
        <td>軍事的影響、軍の移動、兵力の数値など多様な情報を生成</td>
        <td>同じフレーズの繰り返しに陥る</td>
      </tr>
      <tr>
        <td>文法的一貫性</td>
        <td>比較的自然な文章展開</td>
        <td>文の途中で同じパターンが繰り返される</td>
      </tr>
      <tr>
        <td>繰り返し問題</td>
        <td>後半に一部発生</td>
        <td>早期から深刻な繰り返しが発生</td>
      </tr>
    </tbody>
  </table>
</div>

### 原因の考察

**1. Per-sample 戦略で学習が不安定**

Per-sample方式では、同一バッチ内にマスク率90%のサンプルと10%のサンプルが混在することになります。高マスク率のサンプルはロスが大きくなる傾向があるため、勾配更新を支配しやすく、学習が不安定になる可能性が考えられます。

また、現在の`batch_size`や`MAX_STEP`が比較的小さいことも一つの原因と思われます。この条件下では、異なるマスク率のサンプル間で十分な平均化が難しく、勾配更新ごとの分散が大きくなりやすいと考えられます。一方、per-batch方式ではバッチ内の全サンプルが同一のマスク率を持つため、この問題を軽減できる可能性があります。

**2. ノイズレベルの推定が困難**

標準的な拡散モデルでは、timestep embedding を使って「今どれくらいノイズが入っているか」をモデルに明示的に伝えます。しかし、RoBERTaのアーキテクチャーには timestep embedding がないため、本手法では入力中の `<MASK>` トークンの割合をノイズレベルの目安として使っています。

Per-batch方式では、バッチ内の全サンプルが同一のマスク率を持つため、モデルがこのパターンを学習しやすい環境が整います。一方、per-sample方式ではマスク率が混在するため、ノイズレベルの推定がやや困難になり、学習効率に影響を与える可能性があります。

## おわりに

今回はNathan Barry 氏の記事をきっかけに、初めてDiffusion Modelに触れてみました。per-batch方式とper-sample方式の比較では、当初per-sample方式の方がより良いテキストを生成できると予想していましたが、興味深い発見が得られました。実際には、コサイン関数を用いた動的なマスク率スケジューリングなど他の手法も試みましたが、生成結果はper-sample方式と類似していたため、本記事ではper-sampleとper-batchの比較のみを掲載しています。

今後、時間があればAR-DiffusionやSkip-Step Diffusionなど、より高度な手法も試してみたいと考えています。

## References

- [1] [Nathan Barry, “BERT is just a Single Text Diffusion Step”](https://nathan.rs/posts/roberta-diffusion/)
- [2] [Transformer解説](https://deepsquare.jp/2020/07/transformer/)
- [3] [dLLM Repository](https://github.com/ZHZisZZ/dllm)
- [4] [dLLM - BERT-Chat](https://wandb.ai/asap-zzhou/dllm/reports/dLLM-BERT-Chat--VmlldzoxNDg0MzExNg)
- [5] [DiffusionBERT論文](https://aclanthology.org/2023.acl-long.248/)
