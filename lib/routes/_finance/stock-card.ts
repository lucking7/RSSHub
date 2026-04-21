export interface StockItem {
    name: string;
    code: string;
    change?: number | string | null;
}

function formatChange(change: number | string | null | undefined): { color: string; arrow: string; display: string } | null {
    if (change === null || change === undefined) {
        return null;
    }
    const num = typeof change === 'string' ? Number.parseFloat(change.replace('%', '')) : change;
    if (Number.isNaN(num)) {
        return null;
    }
    const color = num > 0 ? '#f5222d' : num < 0 ? '#52c41a' : '#666';
    const arrow = num > 0 ? '↑' : num < 0 ? '↓' : '-';
    const sign = num > 0 ? '+' : '';
    const display = typeof change === 'string' && change.includes('%') ? `${sign}${change}` : `${sign}${num.toFixed(2)}%`;
    return { color, arrow, display };
}

function renderItems(items: StockItem[]): string {
    let html = '';
    for (const item of items) {
        html += `• <strong>${item.name}</strong> <span style="color: #999;">(${item.code})</span><br>`;
        const fmt = formatChange(item.change);
        if (fmt) {
            html += `<span style="color: ${fmt.color}; font-weight: bold;">${fmt.arrow} ${fmt.display}</span><br>`;
        }
    }
    return html;
}

export function renderStockCard(label: string, borderColor: string, items: StockItem[]): string {
    const inner = renderItems(items);
    if (!inner) {
        return '';
    }
    return (
        `<br><div style="background: #f5f5f5; border-left: 3px solid ${borderColor}; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">` +
        `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">${label}</h3>` +
        `${inner}</div>`
    );
}

export function renderSectorAndStockCards(sectors: StockItem[], stocks: StockItem[]): string {
    return renderStockCard('相关板块', '#1890ff', sectors) + renderStockCard('相关股票', '#52c41a', stocks);
}
