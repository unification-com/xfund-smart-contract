const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')
const { v4: uuidv4 } = require("uuid")

const {
  BN,           // Big Number support
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const xFUND = contract.fromArtifact('XFUND') // Loads a compiled contract
const VALADDR = "und1x8pl6wzqf9atkm77ymc5vn5dnpl5xytmn200xy"

function generateTicketMsg(claimantAddr, validator, amount, nonce, sigSalt, contractAddress) {
  return web3.utils.soliditySha3(
      { 'type': 'address', 'value': claimantAddr},
      { 'type': 'bytes32', 'value': web3.utils.soliditySha3(validator)},
      { 'type': 'uint256', 'value': amount.toNumber()},
      { 'type': 'uint256', 'value': nonce},
      { 'type': 'bytes32', 'value': sigSalt},
      { 'type': 'address', 'value': contractAddress}
    )
}

describe('xFUND - claims', function () {
  const [owner, issuer1, issuer2, claimant1, claimant2] = accounts
  const [ownerPk, issuer1Pk, issuer2Pk, claimant1Pk, claimant2Pk] = privateKeys

  beforeEach(async function () {
    this.sigSalt = web3.utils.randomHex(32)
    this.issueRole = web3.utils.sha3('ISSUER_ROLE')
    this.xFUNDContract = await xFUND.new("xFUND", "xFUND", this.sigSalt, {from: owner})

    await this.xFUNDContract.grantRole(this.issueRole, owner, { from: owner})
    this.amount = 24
    this.amountBn = new BN(this.amount * (10 ** 9))
  })

  it('nonce must be greater than zero', async function () {
    let nonce = 0
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: nonce must be greater than zero',
    )
  })

  it('amount must be greater than zero', async function () {
    let nonce = 1
    let zeroAmount = new BN(0)
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, zeroAmount, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)
    await expectRevert(
       this.xFUNDContract.claim(zeroAmount.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: amount must be greater than zero',
    )
  })

  it('must include claim ticket', async function () {
    await expectRevert(
       this.xFUNDContract.claim(1, 1, VALADDR, [], { from: claimant1}),
      'xFUND: must include claim ticket',
    )
  })

  it('must include validator', async function () {
    let nonce = 1
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, "", ticket.signature, { from: claimant1}),
      'xFUND: must include validator',
    )
  })

  it('random ticket bytes fail - incorrect signature length', async function () {
    let rando = web3.utils.randomHex(24)
    await expectRevert(
       this.xFUNDContract.claim(1, 1, VALADDR, rando, { from: claimant1}),
      'ECDSA: invalid signature length',
    )
  })

  it('claimant can claim and TicketClaimed event emitted', async function () {
    let nonce = 1

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    let receipt = await this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1})
    expectEvent(receipt, 'TicketClaimed', {
      claimant: claimant1,
      issuer: owner,
      validator: VALADDR,
      nonce: new BN(nonce),
      amount: this.amountBn,
    })

    // balance should now be 2 xFUND
    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(this.amountBn)
  })

  it('nonce increments correctly', async function () {

    for(let i = 0; i < 10; i += 1) {
      let lastNonce = await this.xFUNDContract.lastNonce(claimant1)
      let nonce = lastNonce.toNumber() + 1
      let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
      let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)
      let receipt = await this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1})

      expectEvent(receipt, 'TicketClaimed', {
        claimant: claimant1,
        issuer: owner,
        validator: VALADDR,
        nonce: new BN(nonce),
        amount: this.amountBn,
      })

      expect(await this.xFUNDContract.lastNonce(claimant1))
      .to.be.bignumber.equal(new BN(nonce))
    }
  })

  it('nonce must increment by 1', async function () {
    let lastNonce = await this.xFUNDContract.lastNonce(claimant1)

    // increment by 2
    let nonce = lastNonce.toNumber() + 2

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: expected nonce mismatch',
    )
  })

  it('claimant cannot claim twice - check nonce', async function () {
    let nonce = 1

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    await this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1})

    let newBalance = await this.xFUNDContract.balanceOf(claimant1)

    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: nonce already used/ticket claimed',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
        .to.be.bignumber.equal(newBalance)
  })

  it('cannot change claimed amount', async function () {
    let nonce = 1

    let dodgyAmount = 10
    let dodgyAmountBn = new BN(dodgyAmount * (10 ** 9))

    // generate ticket for 2 xFUND
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    // claimant attempts to claim dodgyAmount for 10 xFUND
    await expectRevert(
       this.xFUNDContract.claim(dodgyAmountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
        .to.be.bignumber.equal(new BN(0))
  })

  it('cannot claim ticket from different claimant', async function () {
    let nonce = 1

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    // claimant2 attempts to claim claimant1's ticket
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant2}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )
  })

  it('cannot claim ticket from different validator', async function () {
    let nonce = 1

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, ownerPk)

    // different validator address
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, "und1eq239sgefyzm4crl85nfyvt7kw83vrna3f0eed", ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )
  })

  it('unauthorised issuer cannot issue - require ISSUER_ROLE role', async function () {
    let nonce = 1

    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)

    // issuer1 not yet authorised
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)

    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    // claimant attempts to generate own ticket
    let ticket1 = await web3.eth.accounts.sign(ticketMsg, claimant1Pk)

    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket1.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )
  })

  it('nonce only incremented once ticket claimed', async function () {
    let initialLastNonce = await this.xFUNDContract.lastNonce(claimant1)
    let nonce = initialLastNonce.toNumber() + 1

    // generate invalid ticket - issuer1 not authorised
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.lastNonce(claimant1))
      .to.be.bignumber.equal(initialLastNonce)
  })

  it('balance not incremented with invalid ticket', async function () {
    let lastNonce = await this.xFUNDContract.lastNonce(claimant1)
    let nonce = lastNonce.toNumber() + 1

    // generate invalid ticket - issuer1 not authorised
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(new BN(0))
  })

  it('claim ticket must include correct sig salt', async function () {
    let lastNonce = await this.xFUNDContract.lastNonce(claimant1)
    let nonce = lastNonce.toNumber() + 1

    // generate invalid ticket - wrong contract address
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, uuidv4(), this.xFUNDContract.address)
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(new BN(0))
  })

  it('claim ticket must include correct contract address', async function () {
    let lastNonce = await this.xFUNDContract.lastNonce(claimant1)
    let nonce = lastNonce.toNumber() + 1

    // generate invalid ticket - wrong contract address
    let ticketMsg = generateTicketMsg(claimant1, VALADDR, this.amountBn, nonce, this.sigSalt, issuer2)
    let ticket = await web3.eth.accounts.sign(ticketMsg, issuer1Pk)
    await expectRevert(
       this.xFUNDContract.claim(this.amountBn.toNumber(), nonce, VALADDR, ticket.signature, { from: claimant1}),
      'xFUND: ticket invalid or issuer does not have issuer role',
    )

    expect(await this.xFUNDContract.balanceOf(claimant1))
      .to.be.bignumber.equal(new BN(0))
  })
})
