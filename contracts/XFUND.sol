// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev {ERC20} token, including:
 *
 *  - standard ERC20 contract interactions and functions
 *  - an issuer role that allows for token minting via signed claim tickets,
 *    which are issued by authorised addresses having the ISSUER_ROLE role.
 *  - nonce tracking for each address to prevent ticket claim replay
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles.
 *
 * The account that deploys the contract will be granted the ISSUER_ROLE
 * role, as well as the default admin role, which will let it grant
 * and revoke ISSUER_ROLE roles to other accounts.
 */
contract XFUND is Context, AccessControl, ERC20 {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    mapping(address => mapping(uint256 => bool)) _usedNonces;
    mapping(address => uint256) _lastNonce;

    event TicketClaimed(address indexed claimant, address issuer, uint256 indexed nonce, uint256 indexed amount);

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` and `ISSUER_ROLE` to the
     * account that deploys the contract.
     *
     * See {ERC20-constructor}.
     */
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {
        _setupDecimals(9);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(ISSUER_ROLE, _msgSender());
    }

    /**
     * @dev Creates `amount` new tokens for `_msgSender()`, after validating
     * via recovery of data held in `ticket`. The `amount`, `nonce` and
     * `_msgSender()` values are used to recreate the message hash used to sign
     * the `ticket`. If recovery succeeds, the `amount` is minted for
     * `_msgSender()`.
     *
     * Also see {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the `ticket` must have been issued by the `ISSUER_ROLE`.
     * - the `nonce` must not have been used and must be incremented by 1.
     */
    function claim(uint256 amount, uint256 nonce, bytes memory ticket) external {
        require(nonce > 0, "xFUND: nonce must be greater than zero");
        require(amount > 0, "xFUND: amount must be greater than zero");
        require(ticket.length > 0, "xFUND: must include claim ticket");

        require(!_usedNonces[_msgSender()][nonce], "xFUND: nonce already used/ticket claimed");
        _usedNonces[_msgSender()][nonce] = true;

        require(nonce == (_lastNonce[_msgSender()] + 1), "xFUND: expected nonce mismatch");
        _lastNonce[_msgSender()] = _lastNonce[_msgSender()] + 1;

        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_msgSender(), amount, nonce, address(this))));

        address issuer = ECDSA.recover(message, ticket);

        require(hasRole(ISSUER_ROLE, issuer), "xFUND: ticket invalid or issuer does not have issuer role");

        emit TicketClaimed(_msgSender(), issuer, nonce, amount);

        _mint(_msgSender(), amount);
    }

    /**
     * @dev Returns the last nonce value used by a claimant.
     */
    function lastNonce(address account) external view returns (uint256) {
        return _lastNonce[account];
    }
}
