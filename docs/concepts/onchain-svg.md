---
sidebar_position: 3
title: On-Chain SVG NFT
---

# On-Chain SVG NFT

Every `.dex` name is an ERC-721 token with **fully on-chain metadata**.
The image, the JSON, and the URI are all computed inside the contract on
every `tokenURI` call. No IPFS, no external server, no rug-by-CDN.

모든 `.dex` 이름은 **완전 온체인 메타데이터**를 가진 ERC-721 토큰입니다.
이미지, JSON, URI 모두 `tokenURI` 호출마다 컨트랙트 내부에서 계산됩니다.

---

## How `tokenURI` looks

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    string memory label = names[tokenId];
    string memory dotTld = string.concat(".", baseNodeName);
    string memory svg = _generateSVG(label, dotTld);
    string memory json = string.concat(
        '{"name":"', label, dotTld, '",',
        '"description":"DEXignation Name: ', label, dotTld, '",',
        '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
    );
    return string.concat(
        "data:application/json;base64,",
        Base64.encode(bytes(json))
    );
}
```

The result is a `data:` URI that any modern wallet or marketplace can
decode directly.

결과는 어떤 현대적인 지갑이나 마켓플레이스든 바로 디코딩 가능한 `data:` URI.

---

## Trade-offs

| | Pros | Cons |
|---|---|---|
| Fully on-chain | No external dependency, immutable, cheap to verify | Bigger contract bytecode, limited art fidelity |
| Off-chain | High-fidelity art, easy to update | Server dependency, possible rug |

For a name service, on-chain wins.

네임 서비스에는 온체인이 유리.

---

## Full deep-dive

→ [Blog: An ERC-721 with fully on-chain SVG](/blog/onchain-svg-nft)
