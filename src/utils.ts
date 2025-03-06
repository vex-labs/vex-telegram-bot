const USDC_DECIMALS = 6;

function trimTrailingZeroes(value: string): string {
    return value.replace(/\.?0+$/, '');
}

function formatWithCommas(value: string): string {
    const pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(value)) {
        value = value.replace(pattern, '$1,$2');
    }
    return value;
}

export function formatUsdcAmount(balance: string, fracDigits: number = USDC_DECIMALS): string {
    // Convert to number for rounding
    const amount = Number(balance) / Math.pow(10, USDC_DECIMALS);
    
    // Round to specified decimal places
    const rounded = Number(amount.toFixed(fracDigits));
    
    // Convert to string and add commas
    const [wholeStr, fractionStr = ''] = rounded.toString().split('.');
    
    // Ensure fraction has exact number of decimal places
    const paddedFraction = fractionStr.padEnd(fracDigits, '0');
    
    return trimTrailingZeroes(`${formatWithCommas(wholeStr)}.${paddedFraction}`);
}