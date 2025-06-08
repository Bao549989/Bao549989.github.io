// DOM元素
const contentEl = document.getElementById('content');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const totalProductsEl = document.getElementById('totalProducts');
const avgPriceEl = document.getElementById('avgPrice');
const avgRatingEl = document.getElementById('avgRating');
const updateTimeEl = document.getElementById('updateTime');
const switchBtn = document.getElementById('switchBtn');
const databaseLastUpdateEl = document.getElementById('databaseLastUpdate');

let isCPU = false;

// 初始加载数据
document.addEventListener('DOMContentLoaded', async () => {
    await fetchDatabaseLastUpdateTime();
    fetchData();
});

// 搜索功能
searchBtn.addEventListener('click', searchProducts);
searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchProducts();
});

// 切换数据类型
switchBtn.addEventListener('click', () => {
    isCPU = !isCPU;
    switchBtn.textContent = isCPU ? '切换到显卡数据' : '切换到CPU数据';
    fetchData();
});

// 获取数据
function fetchData() {
    const apiUrl = isCPU ? 'http://localhost:3000/api/cpus' : 'http://localhost:3000/api/gpus';
    contentEl.innerHTML = '<div class="loading">加载中...</div>';
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            let products = isCPU ? data.cpus : data.gpus;
            // 去重处理
            products = removeDuplicates(products);
            renderProducts(products);
            updateStats(products);
            // 使用当前时间作为数据更新时间
            updateTimeEl.textContent = formatDate(new Date()) || '未知';
        })
        .catch(error => {
            console.error('获取数据失败:', error);
            showError('数据加载失败，请稍后重试');
        });
}

// 搜索产品
function searchProducts() {
    const keyword = searchInput.value.trim();
    contentEl.innerHTML = '<div class="loading">搜索中...</div>';

    if (!keyword) {
        fetchData();
        return;
    }

    const apiUrl = isCPU ? `http://localhost:3000/api/cpu/search?keyword=${encodeURIComponent(keyword)}` : `http://localhost:3000/api/search?keyword=${encodeURIComponent(keyword)}`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            let products = isCPU ? data.cpus : data.gpus;
            // 去重处理
            products = removeDuplicates(products);
            renderProducts(products);
            updateStats(products);
            // 使用当前时间作为数据更新时间
            updateTimeEl.textContent = formatDate(new Date()) || '未知';
        })
        .catch(error => {
            console.error('搜索失败:', error);
            showError('搜索过程中发生错误');
        });
}

// 渲染产品数据到表格
function renderProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
        showError('未找到产品数据');
        return;
    }

    // 过滤无效数据
    const validProducts = products.filter(product => {
        const name = product.名称 || '';
        return name.trim() !== '' && name.trim().toLowerCase() !== 'n/a';
    });

    if (validProducts.length === 0) {
        showError('未找到匹配的产品');
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>产品名称</th>
                    <th>参考价</th>
                    <th>评分</th>
                    <th>点评数</th>
                    <th>京东价</th>
                    <th>天猫价</th>
                </tr>
            </thead>
            <tbody>
    `;

    validProducts.forEach(product => {
        const productName = product.名称 || 'N/A';
        const productUrl = product.详情页URL || '#';
        const referencePrice = formatPrice(product.参考价);
        const jdPrice = formatPrice(product.京东价格);
        const tmPrice = formatPrice(product.天猫价格);
        const rating = product.评分 || '0';
        const comments = product.点评数量 || '0';

        // 恢复原来的截断标准（8个空格）
        const truncatedName = truncateName(productName);

        tableHTML += `
            <tr>
                <td>
                    <div class="name-container">
                        <a href="${productUrl}" class="product-link" target="_blank">
                            <span class="truncated-name">${truncatedName.display}</span>
                            <span class="full-name">${productName}</span>
                        </a>
                    </div>
                </td>
                <td class="price-cell">${referencePrice}</td>
                <td><span class="rating">${rating}</span></td>
                <td><span class="comments">${comments}</span></td>
                <td class="price-cell">${jdPrice}</td>
                <td class="price-cell">${tmPrice}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    contentEl.innerHTML = tableHTML;
}

// 截断名称（8个空格标准）
function truncateName(fullName) {
    if (!fullName) return { display: '', hasMore: false };

    // 按空格分割名称
    const words = fullName.split(' ');

    // 如果空格少于等于8个，直接返回全名
    if (words.length <= 8) {
        return { display: fullName, hasMore: false };
    }

    // 保留前8个单词
    const truncated = words.slice(0, 8).join(' ');
    return { display: truncated + '...', hasMore: true };
}

// 健壮的价格解析函数
function parsePrice(priceStr) {
    if (!priceStr) return 0;

    // 处理包含"万"的价格
    if (typeof priceStr === 'string' && priceStr.includes('万')) {
        // 移除"万"字并清理非数字字符
        const cleaned = priceStr.replace('万', '').replace(/[^\d.-]/g, '');
        const value = parseFloat(cleaned);
        return !isNaN(value) ? value * 10000 : 0;
    }

    // 普通价格处理
    const cleaned = priceStr.toString().replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
}

// 去重函数 - 保留唯一的"名称+参考价"组合
function removeDuplicates(products) {
    if (!Array.isArray(products) || products.length === 0) return [];

    const seen = new Set();
    return products.filter(product => {
        const name = product.名称 || '';
        const price = product.参考价 || '';

        // 创建唯一标识
        const key = `${name}-${price}`;

        // 如果该组合已存在，则过滤掉
        if (seen.has(key)) {
            return false;
        }

        // 否则添加到已见过的集合中并保留
        seen.add(key);
        return true;
    });
}

// 更新统计信息
function updateStats(products) {
    if (!Array.isArray(products) || products.length === 0) {
        totalProductsEl.textContent = '0';
        avgPriceEl.textContent = '¥0';
        avgRatingEl.textContent = '0';
        return;
    }

    const total = products.length;
    totalProductsEl.textContent = total;

    // 计算平均价格
    const validPrices = products
        .map(product => parsePrice(product.参考价))
        .filter(price => price > 0);

    const totalPrice = validPrices.reduce((sum, price) => sum + price, 0);
    const avgPrice = validPrices.length > 0 ? (totalPrice / validPrices.length).toFixed(2) : 0;
    avgPriceEl.textContent = `¥${avgPrice}`;

    // 计算平均评分
    const validRatings = products
        .map(product => parseFloat(product.评分))
        .filter(rating => !isNaN(rating) && rating > 0);

    const totalRating = validRatings.reduce((sum, rating) => sum + rating, 0);
    const avgRating = validRatings.length > 0 ? (totalRating / validRatings.length).toFixed(1) : 0;
    avgRatingEl.textContent = avgRating;
}

// 显示错误信息
function showError(message) {
    contentEl.innerHTML = `<div class="error">${message}</div>`;
}

// 格式化价格
function formatPrice(price) {
    if (!price || isNaN(parsePrice(price))) {
        return 'N/A';
    }
    const num = parsePrice(price);
    return num > 0 ? `¥${num.toFixed(2)}` : 'N/A';
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 获取数据库最后修改时间
async function fetchDatabaseLastUpdateTime() {
    try {
        const response = await fetch('http://localhost:3000/api/database-last-update');
        if (!response.ok) {
            throw new Error('网络响应错误: ' + response.status);
        }
        const data = await response.json();
        databaseLastUpdateEl.textContent = formatDate(data.lastUpdate) || '未知';
    } catch (error) {
        console.error('获取数据库最后修改时间失败:', error);
        databaseLastUpdateEl.textContent = '未知';
    }
}
