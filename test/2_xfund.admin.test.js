const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')
const { v4: uuidv4 } = require("uuid")

const {
  BN,           // Big Number support
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const xFUND = contract.fromArtifact('XFUND') // Loads a compiled contract

function generateTicketMsg(claimantAddr, amount, nonce, sigSalt, contractAddress) {
  return web3.utils.soliditySha3(
      { 'type': 'address', 'value': claimantAddr},
      { 'type': 'uint256', 'value': amount.toNumber()},
      { 'type': 'uint256', 'value': nonce},
      { 'type': 'bytes32', 'value': sigSalt},
      { 'type': 'address', 'value': contractAddress}
    )
}

describe('xFUND - admin', function () {
  const [owner, issuer1, issuer2, claimant1, claimant2] = accounts
  const [ownerPk, issuer1Pk, issuer2Pk, claimant1Pk, claimant2Pk] = privateKeys

  beforeEach(async function () {
    this.sigSalt = web3.utils.randomHex(32)
    this.xFUNDContract = await xFUND.new("xFUND", "xFUND", this.sigSalt, {from: owner})
    this.issueRole = web3.utils.sha3('ISSUER_ROLE')
  })

  it('admin can grant ISSUE_ROLE', async function () {
    let receipt = await this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt, 'RoleGranted', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)
  })

  it('only admin can grant ISSUE_ROLE', async function () {
    await expectRevert(
       this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: issuer1}),
      'AccessControl: sender must be an admin to grant',
    )

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(false)
  })

  it('admin can revoke ISSUE_ROLE', async function () {
    let receipt = await this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt, 'RoleGranted', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)

    let receipt1 = await this.xFUNDContract.revokeRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt1, 'RoleRevoked', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(false)
  })

  it('only admin can revoke ISSUE_ROLE', async function () {
    let receipt = await this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt, 'RoleGranted', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)

    await expectRevert(
       this.xFUNDContract.revokeRole(this.issueRole, issuer1, { from: issuer2}),
      'AccessControl: sender must be an admin to revoke',
    )

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)
  })

  it('new issuer can issue ticket', async function () {
    // grant ISSUER_ROLE to issuer1 address
    let receipt = await this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt, 'RoleGranted', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)

    let amount = 2
    let nonce = 1
    let amountBn = new BN(amount * (10 ** 9))

    let ticketMsg = generateTicketMsg(claimant1, amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    // sign ticket with issuer1 PK
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)

    let receipt2 = await this.xFUNDContract.claim(amountBn.toNumber(), nonce, ticket.signature, { from: claimant1})
    expectEvent(receipt2, 'TicketClaimed', {
      claimant: claimant1,
      issuer: issuer1,
      nonce: new BN(nonce),
      amount: amountBn,
    })

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(amountBn)

  })

  it('revoked issuer cannot issue ticket', async function () {
    // grant ISSUER_ROLE to issuer1 address
    let receipt = await this.xFUNDContract.grantRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt, 'RoleGranted', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(true)

    let amount = 2
    let amountBn = new BN(amount * (10 ** 9))
    let lastNonce = await this.xFUNDContract.lastNonce(claimant1)
    let nonce = lastNonce.toNumber() + 1

    let ticketMsg = generateTicketMsg(claimant1, amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    // sign ticket with issuer1 PK
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)

    let receipt1 = await this.xFUNDContract.claim(amountBn.toNumber(), nonce, ticket.signature, { from: claimant1})
    expectEvent(receipt1, 'TicketClaimed', {
      claimant: claimant1,
      issuer: issuer1,
      nonce: new BN(nonce),
      amount: amountBn,
    })

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(amountBn)

    let currentBalance = await this.xFUNDContract.balanceOf(claimant1)
    lastNonce = await this.xFUNDContract.lastNonce(claimant1)
    nonce = lastNonce.toNumber() + 1

    // revoke issuer1
    let receipt2 = await this.xFUNDContract.revokeRole(this.issueRole, issuer1, { from: owner})
    expectEvent(receipt2, 'RoleRevoked', {
      role: this.issueRole,
      account: issuer1,
      sender: owner,
    })

    expect(await this.xFUNDContract.hasRole(this.issueRole, issuer1)).to.equal(false)

    // issuer1 attempts to issue new ticket
    let ticketMsg1 = generateTicketMsg(claimant1, amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    // sign ticket with issuer1 PK
    let ticket1 = await web3.eth.accounts.sign(ticketMsg1, issuer1Pk) 

    await expectRevert(
       this.xFUNDContract.claim(amountBn.toNumber(), nonce, ticket1.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(currentBalance)
  })
})
