require("dotenv").config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { ETH_PKEY_RINKEBY, INFURA_PROJECT_ID_RINKEBY, ETH_PKEY_MAINNET, INFURA_PROJECT_ID_MAINNET } = process.env

module.exports = {
  networks: {
    development: {
      protocol: 'http',
      host: 'localhost',
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: '*',
    },
    rinkeby: {
      provider: () => new HDWalletProvider(
        [ETH_PKEY_RINKEBY], `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID_RINKEBY}`, 0, 1
      ),
      networkId: 4,
      gasPrice: 100e9
    },
    mainnet: {
      provider: () => new HDWalletProvider(
        [ETH_PKEY_MAINNET], `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID_MAINNET}`, 0, 1
      ),
      networkId: 1,
      gasPrice: 80e9
    }
  },
};
