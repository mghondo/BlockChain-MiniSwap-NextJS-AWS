// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IMiniSwapRouter.sol";
import "../interfaces/IMiniSwapFactory.sol";
import "../interfaces/IMiniSwapPair.sol";
import "../libraries/MiniSwapLibrary.sol";

contract MiniSwapRouter is IMiniSwapRouter, ReentrancyGuard {
    address public immutable factory;
    address public immutable WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "MiniSwapRouter: EXPIRED");
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = MiniSwapLibrary.pairFor(factory, tokenA, tokenB);
        
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        
        liquidity = IMiniSwapPair(pair).mint(to);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        // TODO: Implement ETH liquidity addition
        // This requires WETH wrapping logic
        revert("Not implemented yet");
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = MiniSwapLibrary.pairFor(factory, tokenA, tokenB);
        IERC20(pair).transferFrom(msg.sender, pair, liquidity);
        
        (uint256 amount0, uint256 amount1) = IMiniSwapPair(pair).burn(to);
        (address token0,) = MiniSwapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        require(amountA >= amountAMin, "MiniSwapRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "MiniSwapRouter: INSUFFICIENT_B_AMOUNT");
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountToken, uint256 amountETH) {
        // TODO: Implement ETH liquidity removal
        // This requires WETH unwrapping logic
        revert("Not implemented yet");
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = MiniSwapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "MiniSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        IERC20(path[0]).transferFrom(
            msg.sender, 
            MiniSwapLibrary.pairFor(factory, path[0], path[1]), 
            amounts[0]
        );
        
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = MiniSwapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "MiniSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        
        IERC20(path[0]).transferFrom(
            msg.sender, 
            MiniSwapLibrary.pairFor(factory, path[0], path[1]), 
            amounts[0]
        );
        
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(
        uint256 amountOutMin, 
        address[] calldata path, 
        address to, 
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        // TODO: Implement ETH to token swaps
        // This requires WETH wrapping logic
        revert("Not implemented yet");
    }

    function swapTokensForExactETH(
        uint256 amountOut, 
        uint256 amountInMax, 
        address[] calldata path, 
        address to, 
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        // TODO: Implement token to ETH swaps
        // This requires WETH unwrapping logic
        revert("Not implemented yet");
    }

    function swapExactTokensForETH(
        uint256 amountIn, 
        uint256 amountOutMin, 
        address[] calldata path, 
        address to, 
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        // TODO: Implement token to ETH swaps
        // This requires WETH unwrapping logic
        revert("Not implemented yet");
    }

    function swapETHForExactTokens(
        uint256 amountOut, 
        address[] calldata path, 
        address to, 
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        // TODO: Implement ETH to token swaps
        // This requires WETH wrapping logic
        revert("Not implemented yet");
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        return MiniSwapLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        return MiniSwapLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountIn) {
        return MiniSwapLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        return MiniSwapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] memory path) public view returns (uint256[] memory amounts) {
        return MiniSwapLibrary.getAmountsIn(factory, amountOut, path);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        if (IMiniSwapFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IMiniSwapFactory(factory).createPair(tokenA, tokenB);
        }
        
        (uint256 reserveA, uint256 reserveB) = MiniSwapLibrary.getReserves(factory, tokenA, tokenB);
        
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = MiniSwapLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "MiniSwapRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = MiniSwapLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "MiniSwapRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = MiniSwapLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            
            (uint256 amount0Out, uint256 amount1Out) = input == token0 
                ? (uint256(0), amountOut) 
                : (amountOut, uint256(0));
            
            address to = i < path.length - 2 
                ? MiniSwapLibrary.pairFor(factory, output, path[i + 2]) 
                : _to;
            
            IMiniSwapPair(MiniSwapLibrary.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
}