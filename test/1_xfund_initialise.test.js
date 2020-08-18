const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const xFUND = contract.fromArtifact('XFUND') // Loads a compiled contract

describe('xFUND - initialise', function () {
  const [owner, issuer, claimant] = accounts

  beforeEach(async function () {
    this.xFUNDContract = await xFUND.new("xFUND", "xFUND", {from: owner})
  })

  it('initial total supply is zero', async function () {
    expect(await this.xFUNDContract.totalSupply())
      .to.be.bignumber.equal(new BN(0))
  })

  it('initial balance is zero', async function () {
    expect(await this.xFUNDContract.balanceOf(claimant))
      .to.be.bignumber.equal(new BN(0))
  })

  it('only owner account should initially have ISSUER_ROLE role', async function () {
    expect(await this.xFUNDContract.hasRole(web3.utils.sha3('ISSUER_ROLE'), owner)).to.equal(true)
    expect(await this.xFUNDContract.hasRole(web3.utils.sha3('ISSUER_ROLE'), issuer)).to.equal(false)
  })

  it('only owner account should initially have DEFAULT_ADMIN_ROLE (0x00)', async function () {
    expect(await this.xFUNDContract.hasRole([0,0], owner)).to.equal(true)
    expect(await this.xFUNDContract.hasRole([0,0], issuer)).to.equal(false)
  })

  it('initial lastNonce is zero', async function () {
    expect(await this.xFUNDContract.lastNonce(claimant))
      .to.be.bignumber.equal(new BN(0))
  })
})
