# xFUND Smart Contract

ERC20 Smart Contract for the `xFUND` token. The smart contract is an extended
ERC20 contract, with modified minting functionality. The contract is deployed
with an initial supply of zero tokens.

`xFUND` tokens are minted and issued using claim tickets, which can be generated and
signed by accounts with the `ISSUER_ROLE` role in the smart contract. These tickets
are signed offline for claimants, and it is up to the claimant to submit the
claim ticket to the smart contract in order to have the allocated number of
tokens minted for their account.

The `ISSUER_ROLE` can be granted and revoked as required.

## Prerequisites

### NodeJS
The `openzeppelin/test-environment` packages and dependencies require
NodeJS >= `v8.9.4` and <= `v12.18.3` (excluding `v11`) in order to correctly install. 
We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage NodeJS 
installations.

### Yarn

[Yarn](https://classic.yarnpkg.com/en/docs/install) is recommended for package management.

## Compile

Run:

```bash
yarn install
```

to install the Node packages and dependencies

Run:
```bash 
npx oz compile
```

to compile smart contract

## Unit Tests

Run:

```bash 
npm test
```

## Deploying with `ganache-cli`

If `ganache-cli` is not installed, install with:

```bash
npm install -i ganache-cli
```

Run `ganache-cli` with:

```bash
npx ganache-cli --deterministic
```

The `--deterministic` flag will ensure the same keys and accounts are generated
each time

Deploy with:

```bash
npx oz deploy
```

Select `regular` deployment, `development` network, and the `xFUND` contract.

The Name and Symbol are xFUND and XFUND respectively.

## Interacting with the deployed smart contract

The standard ERC20 functions are available. Additionally, there are two main extended
functions, which allow for the claim ticket functionality - `claim`, and `lastNonce`.

### claim

#### Generating a claim ticket

#### Submitting a claim ticket

### lastNonce
