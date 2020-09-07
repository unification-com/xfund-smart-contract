require("dotenv").config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { ETH_PKEY, INFURA_PROJECT_ID } = process.env

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
        [ETH_PKEY], `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`, 0, 1
      ),
      networkId: 4,
      gasPrice: 10e9
    }
  },
};
