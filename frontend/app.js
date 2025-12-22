let loggedIn = false;

// ===== 页面加载时恢复登录状态 =====
window.addEventListener('DOMContentLoaded', function() {
    const loginInfoStr = localStorage.getItem('loginInfo');
    if (loginInfoStr) {
        const loginInfo = JSON.parse(loginInfoStr);
        if (loginInfo.isLogin) {
            if (loginInfo.role === 'admin') {
                document.body.classList.add('admin-mode');
                document.getElementById('center-buttons').style.display = 'none';
                document.getElementById('admin-modal').style.display = 'flex';
            } else {
                document.getElementById('center-buttons').style.display = 'none';
                document.getElementById('nav-box').style.display = 'flex';
            }
        }
    }
    // ********** 用户搜索事件**********
    const userSearchMode = document.getElementById('user-search-mode');
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchContainer = document.getElementById('user-search-container');
    const userQueryBtn = document.getElementById('user-query-btn');

    // 用户查询按钮点击事件
    userQueryBtn.addEventListener('click', function() {
        if (userSearchContainer.classList.contains('active')) {
            manageUserInfo(userSearchMode.value, userSearchInput.value);
        }
    });

    // 用户回车搜索事件
    userSearchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' && userSearchContainer.classList.contains('active')) {
            manageUserInfo(userSearchMode.value, userSearchInput.value);
        }
    });

    userSearchMode.addEventListener('change', function() {
        userSearchInput.value = '';
    });

    // ********** 商品搜索事件**********
    const itemSearchMode = document.getElementById('item-search-mode');
    const itemSearchInput = document.getElementById('item-search-input');
    const itemSortMode = document.getElementById('item-sort-mode');
    const sortDirection = document.getElementById('sort-direction');
    const itemQueryBtn = document.getElementById('item-query-btn');
    const itemSearchContainer = document.getElementById('item-search-container');

    itemQueryBtn.addEventListener('click', function() {
        if (itemSearchContainer.classList.contains('active')) {
            manageProductInfo(
                itemSearchMode.value,
                itemSearchInput.value,
                itemSortMode.value,
                sortDirection.value
            );
        }
    });

    itemSearchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' && itemSearchContainer.classList.contains('active')) {
            manageProductInfo(
                itemSearchMode.value,
                itemSearchInput.value,
                itemSortMode.value,
                sortDirection.value
            );
        }
    });

    itemSearchMode.addEventListener('change', function() {
        itemSearchInput.value = '';
    });
});

function goHome() {
    document.getElementById('content').innerHTML = '';
}


function showLogin() {
    showModal('login');
}

function showRegister() {
    showModal('register');
}

function showModal(mode) {
    const contentDiv = document.getElementById('content');
    let html = `
        <div class="modal" id="modal">
            <div class="card">
                <div class="card-content">
                    <div style="text-align:right;">
                        <button onclick="closeModal()" style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                    </div>
                    <h2>${mode === 'login' ? '用户登录' : '新用户注册'}</h2>
                    <input type="text" id="username" placeholder="用户名" /><br><br>
                    <input type="password" id="password" placeholder="密码" /><br><br>
                    ${mode === 'register' ? `
                        <input type="text" id="realname" placeholder="真实姓名" /><br><br>
                        <input type="text" id="phone" placeholder="手机号" /><br><br>
                        <input type="text" id="email" placeholder="邮箱" /><br><br>
                    ` : ''}
                    <button onclick="submitForm('${mode}')">${mode === 'login' ? '登录' : '注册'}</button>
            </div>
        </div>
    `;
    contentDiv.innerHTML = html;
}

function closeModal() {
    const modal = document.getElementById('modal');
    if(modal) modal.remove();
}

function submitForm(mode) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (!usernameInput || !passwordInput) {
        alert('页面元素异常，请刷新重试！');
        return;
    }
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        alert('用户名和密码不能为空！');
        return;
    }

    const baseUrl = 'http://127.0.0.1:8000/api';

    if (mode === 'register') {
        const realname = document.getElementById('realname')?.value.trim() || '';
        const phone = document.getElementById('phone')?.value.trim() || '';
        const email = document.getElementById('email')?.value.trim() || '';

        if (!realname || !phone) {
            alert('真实姓名和手机号为必填项！');
            return;
        }
        fetch(`${baseUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                real_name: realname,
                phone: phone,
                email: email
            })
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP错误：${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('注册成功！请登录');
                closeModal();
                showLogin();
            } else {
                alert(`注册失败：${data.message || '未知错误'}`);
            }
        })
        .catch(error => {
            alert(`注册请求失败：${error.message}`);
        });

    // 登录逻辑
    } else {
        fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 存储登录信息
                const loginInfo = {
                    username: username,
                    user_id: data.user_id,
                    real_name: data.real_name,
                    role: data.role || 'user',
                    isLogin: true
                };
                localStorage.setItem('loginInfo', JSON.stringify(loginInfo));
                localStorage.setItem('token', data.access_token);

                loggedIn = true;
                closeModal();

                if (loginInfo.role === 'admin') {
                    document.getElementById('center-buttons').style.display = 'none';
                    document.getElementById('nav-box').style.display = 'flex';
                    document.getElementById('admin-modal').style.display = 'flex';
                } else {
                    document.getElementById('center-buttons').style.display = 'none';
                    document.getElementById('nav-box').style.display = 'flex';
                    alert(`登录成功！欢迎你，${data.real_name}`);
                }
            } else {
                alert(`登录失败：${data.message || '用户名或密码错误'}`);
            }
        })
    }
}

// 商品浏览功能
function showItems() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="goods-panel">
            <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品列表</h2>
            <div style="text-align: center; padding: 50px;">
                加载中...
            </div>
        </div>
    `;
    fetch('http://127.0.0.1:8000/api/items')
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取商品失败 (状态码: ${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.items.length > 0) {
                let itemsHtml = `
                    <div class="goods-panel">
                        <div class="filter-container">
                            <button class="filter-toggle" onclick="toggleFilter()">
                                ${isFilterOpen ? '收起筛选' : '展开筛选'}
                            </button>
                            <button class="filter-btn reset-btn" onclick="resetSort()">默认排序</button>
                            <div class="filter-content" style="${isFilterOpen ? 'display: block;' : 'display: none;'}">
                                <div class="filter-row">
                                    <div class="filter-item">
                                        <label>商品类别:</label>
                                        <select id="filter-category">
                                            <option value="">全部类别</option>
                                            <option value="1">数码电子</option>
                                            <option value="2">数码配件</option>
                                            <option value="3">书籍教材</option>
                                            <option value="4">生活用品</option>
                                            <option value="5">美妆护肤</option>
                                            <option value="6">服饰鞋包</option>
                                            <option value="7">运动户外</option>
                                            <option value="8">其他</option>
                                        </select>
                                    </div>
                                    <div class="filter-item">
                                        <label>价格排序:</label>
                                        <select id="filter-sort">
                                            <option value="date_desc">最新发布</option>
                                            <option value="price_asc">价格从低到高</option>
                                            <option value="price_desc">价格从高到低</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="filter-row">
                                    <div class="filter-item">
                                        <label>搜索关键词:</label>
                                        <input type="text" id="filter-keyword" placeholder="输入商品名称">
                                    </div>
                                    <div class="filter-item">
                                        <button class="filter-btn" onclick="applyFilter()">应用筛选</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品列表</h2>
                        <div class="goods-header">
                            <div class="goods-col">商品名称</div>
                            <div class="goods-col">卖家</div>
                            <div class="goods-col">数量</div>
                            <div class="goods-col">总价格 (元)</div>
                        </div>
                `;
                data.items.forEach(item => {
                    itemsHtml += `
                        <div class="goods-item-box">
                            <div class="goods-item first-row">
                                <div class="goods-col">${item.title}</div>
                                <div class="goods-col">${item.seller_name}</div>
                                <div class="goods-col">${item.quantity}</div>
                                <div class="goods-col" style="color: #b3001b; font-weight: bold;">
                                    ${item.price.toFixed(2)}
                                </div>
                            </div>
                            <div class="goods-item second-row">
                                <div class="view-count">浏览数：${item.views || 0}</div>
                                <button class="detail-btn" onclick="showItemDetail(${item.item_id})">查看详情</button>
                            </div>
                       </div>
                    `;
                });

                itemsHtml += `</div>`;
                contentDiv.innerHTML = itemsHtml;
            } else {
                contentDiv.innerHTML = `
                    <div class="goods-panel">
                        <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品列表</h2>
                        <div style="text-align: center; padding: 50px; color: #666;">
                            暂无可用商品
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            alert(`获取商品列表失败`);
        });
}

let isFilterOpen = false;

function toggleFilter() {
    isFilterOpen = !isFilterOpen;
    const filterContent = document.querySelector('.filter-content');
    const filterToggle = document.querySelector('.filter-toggle');

    if (filterContent && filterToggle) {
        filterContent.style.display = isFilterOpen ? 'block' : 'none';
        filterToggle.textContent = isFilterOpen ? '收起筛选' : '展开筛选';
    }
}

function resetSort() {
    document.getElementById('filter-sort').value = 'date_desc';
    applyFilter();
}

function applyFilter() {
    const category = document.getElementById('filter-category').value;
    const sort = document.getElementById('filter-sort').value;
    const keyword = document.getElementById('filter-keyword').value.trim();

    let url = 'http://127.0.0.1:8000/api/items?';
    const params = [];

    if (category) {
        params.push(`category_id=${category}`);
    }
    if (sort) {
        params.push(`sort=${sort}`);
    }
    if (keyword) {
        params.push(`keyword=${encodeURIComponent(keyword)}`);
    }

    if (params.length > 0) url += params.join('&');

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`筛选失败 (状态码: ${response.status})`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                isFilterOpen = true;
                renderItems(data.items);
                document.getElementById('filter-category').value = category;
                document.getElementById('filter-sort').value = sort;
                document.getElementById('filter-keyword').value = keyword;
            }
        })
        .catch(error => {
            alert(`筛选失败: ${error.message}`);
        });
}

// 渲染商品列表
function renderItems(items) {
    const contentDiv = document.getElementById('content');
    let itemsHtml = `
        <div class="goods-panel">
            <div class="filter-container">
                <button class="filter-toggle" onclick="toggleFilter()">
                    ${isFilterOpen ? '收起筛选' : '展开筛选'}
                </button>
                <button class="filter-btn reset-btn" onclick="resetSort()">默认排序</button>
                <div class="filter-content" style="${isFilterOpen ? 'display: block;' : 'display: none;'}">
                    <div class="filter-row">
                        <div class="filter-item">
                            <label>商品类别:</label>
                            <select id="filter-category">
                                <option value="">全部类别</option>
                                <option value="1">数码电子</option>
                                <option value="2">数码配件</option>
                                <option value="3">书籍教材</option>
                                <option value="4">生活用品</option>
                                <option value="5">美妆护肤</option>
                                <option value="6">服饰鞋包</option>
                                <option value="7">运动户外</option>
                                <option value="8">其他</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label>价格排序:</label>
                            <select id="filter-sort">
                                <option value="date_desc">最新发布</option>
                                <option value="price_asc">价格从低到高</option>
                                <option value="price_desc">价格从高到低</option>
                            </select>
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-item">
                            <label>搜索关键词:</label>
                            <input type="text" id="filter-keyword" placeholder="输入商品名称">
                        </div>
                        <div class="filter-item">
                            <button class="filter-btn" onclick="applyFilter()">应用筛选</button>
                        </div>
                    </div>
                </div>
            </div>

            <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品列表</h2>
            <div class="goods-header">
                <div class="goods-col">商品名称</div>
                <div class="goods-col">卖家</div>
                <div class="goods-col">数量</div>
                <div class="goods-col">总价格 (元)</div>
            </div>
    `;

    if (items.length > 0) {
        items.forEach(item => {
            itemsHtml += `
                <div class="goods-item-box">
                    <div class="goods-item first-row">
                        <div class="goods-col">${item.title}</div>
                        <div class="goods-col">${item.seller_name}</div>
                        <div class="goods-col">${item.quantity}</div>
                        <div class="goods-col" style="color: #b3001b; font-weight: bold;">
                            ${item.price.toFixed(2)}
                        </div>
                    </div>
                    <div class="goods-item second-row">
                        <div class="view-count">浏览数：${item.views || 0}</div>
                        <button class="detail-btn" onclick="showItemDetail(${item.item_id})">查看详情</button>
                    </div>
               </div>
            `;
        });
    } else {
        itemsHtml += `
            <div style="text-align: center; padding: 50px; color: #666;">
                没有找到符合条件的商品
            </div>
        `;
    }

    itemsHtml += `</div>`;
    contentDiv.innerHTML = itemsHtml;
}

// 显示发布商品表单
function showPublish() {
    const contentDiv = document.getElementById('content');
    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) {
        alert('请先登录');
        return;
    }

    const publishHtml = `
        <div class="goods-panel">
            <h2 style="text-align: center; color: #b3001b; margin-bottom: 25px; margin-top: 50px;">发布商品</h2>

            <div style="max-width: 600px; margin: 0 auto; padding: 0 20px; box-sizing: border-box;">
                <div style="margin-bottom: 20px; width: 100%;">
                    <input
                        type="text"
                        id="itemTitle"
                        placeholder="请输入商品标题"
                        style="width: 100%;
                               padding: 12px 15px;
                               font-size: 16px;
                               border: 1px solid #ddd;
                               border-radius: 6px;
                               box-sizing: border-box;
                               outline: none;
                               text-align: center;"
                    />
                </div>
                <div style="display: flex; gap: 15px; margin-bottom: 20px; width: 100%;">
                    <div style="flex: 1;">
                        <input
                            type="number"
                            id="itemPrice"
                            placeholder="价格（元）"
                            min="0.01"
                            step="0.01"
                            style="width: 100%;
                                   padding: 12px 15px;
                                   font-size: 16px;
                                   border: 1px solid #ddd;
                                   border-radius: 6px;
                                   box-sizing: border-box;
                                   outline: none;
                                   text-align: center;"
                        />
                    </div>
                    <div style="flex: 1;">
                        <input
                            type="number"
                            id="itemQuantity"
                            placeholder="数量"
                            min="1"
                            style="width: 100%;
                                   padding: 12px 15px;
                                   font-size: 16px;
                                   border: 1px solid #ddd;
                                   border-radius: 6px;
                                   box-sizing: border-box;
                                   outline: none;
                                   text-align: center;"
                        />
                    </div>
                </div>
                <div style="margin-bottom: 20px; width: 100%;">
                    <textarea
                        id="itemDescription"
                        placeholder="请输入商品详细描述"
                        style="width: 100%;
                               height: 180px;
                               padding: 15px;
                               font-size: 16px;
                               border: 1px solid #ddd;
                               border-radius: 6px;
                               box-sizing: border-box;
                               outline: none;
                               resize: none;
                               text-align: left;">
                    </textarea>
                </div>
                <div style="margin-bottom: 30px; width: 100%;">
                    <select
                        id="itemCategory"
                        style="width: 100%;
                               padding: 12px 15px;
                               font-size: 16px;
                               border: 1px solid #ddd;
                               border-radius: 6px;
                               box-sizing: border-box;
                               outline: none;
                               text-align: center;
                               background-color: #fff;"
                    >
                        <option value="" selected disabled hidden>选择类别</option>
                        <option value="1">数码电子</option>
                        <option value="2">数码配件</option>
                        <option value="3">书籍教材</option>
                        <option value="4">生活用品</option>
                        <option value="5">美妆护肤</option>
                        <option value="6">服饰鞋包</option>
                        <option value="7">运动户外</option>
                        <option value="8">其他</option>
                    </select>
                </div>
                <div style="text-align: center; margin-bottom: 150px;">
                    <button
                        onclick="submitItem()"
                        style="padding: 12px 40px;
                               font-size: 18px;
                               background-color: #b3001b;
                               color: white;
                               border: none;
                               border-radius: 6px;
                               cursor: pointer;
                               outline: none;
                               transition: background-color 0.2s;"
                        onmouseover="this.style.backgroundColor='#990017'"
                        onmouseout="this.style.backgroundColor='#b3001b'"
                    >
                        发布商品
                    </button>
                </div>
            </div>
        </div>
    `;
    contentDiv.innerHTML = publishHtml;
    document.getElementById('itemDescription').value = '';
}

// 显示商品详情
function showItemDetail(itemId) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="goods-panel">
            <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品详情</h2>
            <div style="text-align: center; padding: 50px;">
                加载中...
            </div>
        </div>
    `;
    fetch(`http://127.0.0.1:8000/api/items/${itemId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取商品详情失败 (状态码: ${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.item) {
                const item = data.item;
                const detailHtml = `
                    <div class="goods-panel">
                        <button
                            onclick="showItems()"
                            style="position: absolute; top: 20px; left: 20px; background: none; border: none; font-size: 24px; cursor: pointer;"
                        >
                            ×
                        </button>
                        <h2 style="text-align: center; color: #b3001b; margin: 20px 0;">商品详情</h2>
                        <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
                            <div style="font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px;">
                                ${item.title}
                            </div>
                            <div style="display: flex; gap: 30px; margin-bottom: 40px;">
                                <div style="flex: 2;">
                                    <div style="font-size: 16px; color: #666; line-height: 1.6;">
                                        <strong>商品描述：</strong><br>
                                        ${item.description || '暂无描述'}
                                    </div>
                                    <div style="margin-top: 20px; color: #888;">
                                        <strong>卖家：</strong>${item.seller_name}<br>
                                        <strong>发布时间：</strong>${item.publish_date || '未知'}
                                    </div>
                                </div>
                                <div style="flex: 1; text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                    <div style="font-size: 28px; color: #b3001b; font-weight: bold; margin-bottom: 15px;">
                                        ¥${item.price.toFixed(2)}
                                    </div>
                                    <div style="font-size: 16px; color: #666;">
                                        库存: ${item.quantity} 件
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: center; margin: 40px 0 80px 0;">
                               <button
                                    onclick="window.currentItemId=${item.item_id}; showPurchaseModal(${item.item_id})"
                                    style="padding: 12px 40px;
                                           font-size: 18px;
                                           background-color: #b3001b;
                                           color: white;
                                           border: none;
                                           border-radius: 6px;
                                           cursor: pointer;
                                           outline: none;
                                           transition: background-color 0.2s;"
                                    onmouseover="this.style.backgroundColor='#990017'"
                                    onmouseout="this.style.backgroundColor='#b3001b'"
                                >
                                    立即购买
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                contentDiv.innerHTML = detailHtml;
            } else {
                contentDiv.innerHTML = `
                    <div class="goods-panel">
                        <button
                            onclick="showItems()"
                            style="position: absolute; top: 20px; left: 20px; background: none; border: none; font-size: 24px; cursor: pointer;"
                        >
                            ×
                        </button>
                        <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品详情</h2>
                        <div style="text-align: center; padding: 50px; color: #666;">
                            无法获取商品详情
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            contentDiv.innerHTML = `
                <div class="goods-panel">
                    <button
                        onclick="showItems()"
                        style="position: absolute; top: 20px; left: 20px; background: none; border: none; font-size: 24px; cursor: pointer;"
                    >
                        ×
                    </button>
                    <h2 style="text-align: center; color: #b3001b; margin-bottom: 20px;">商品详情</h2>
                    <div style="text-align: center; padding: 50px; color: #ff0000;">
                        加载失败: ${error.message}
                    </div>
                </div>
            `;
        });
}

function showPurchaseModal(itemId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        showLogin();
        return;
    }

    fetch('http://127.0.0.1:8000/api/user-addresses', {
        headers: {
            'Authorization': `bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取地址失败');
        }
        return response.json();
    })
    .then(data => {
        const addresses = data.success ? data.addresses : [];
        let addressesHtml = '';
        if (addresses.length > 0) {
            addresses.forEach(addr => {
                addressesHtml += `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; padding: 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                            <input type="radio" name="address" value="${addr.address_id}" ${addr.address_id === addresses[0].address_id ? 'checked' : ''}>
                            <div>${addr.recipient} ${addr.phone}</div>
                            <div>${addr.detail_address}</div>
                        </label>
                    </div>
                `;
            });
        } else {
            addressesHtml = '<div style="text-align: center; color: #666; margin: 20px 0;">暂无收货地址，请添加</div>';
        }
        document.body.insertAdjacentHTML('beforeend', `
            <div class="auth-modal" id="purchase-modal" onclick="this.remove()">
                <div class="auth-card" onclick="event.stopPropagation()" style="width: 400px;">
                    <div style="text-align:right;">
                        <button onclick="document.getElementById('purchase-modal').remove()"
                            style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                    </div>
                    <h3>确认购买</h3>
                    <div style="margin: 20px 0;">
                        <h4 style="margin-bottom: 10px;">选择收货地址</h4>
                        ${addressesHtml}
                        <button onclick="showAddAddressModal();"
                            style="margin-top: 10px; padding: 5px 10px; font-size: 14px;">
                            + 添加新地址
                        </button>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <button class="edit-btn" onclick="confirmPayment(${itemId})">
                            确认支付
                        </button>
                    </div>
                </div>
            </div>
        `);
    })
    .catch(error => {
        alert(`获取地址失败: ${error.message}`);
    });
}

function showAddAddressModal() {
    document.getElementById('purchase-modal').remove();
    document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" id="add-address-modal" onclick="this.remove()">
            <div class="auth-card" onclick="event.stopPropagation()">
                <div style="text-align:right;">
                    <button onclick="document.getElementById('add-address-modal').remove()"
                        style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                </div>
                <h3>添加收货地址</h3>
                <input id="addr-recipient" placeholder="收货人"><br><br>
                <input id="addr-phone" placeholder="手机号"><br><br>
                <textarea id="addr-detail" placeholder="详细地址" style="width:100%;height:80px;"></textarea><br><br>
                <button class="edit-btn" onclick="saveNewAddress()">
                    保存地址
                </button>
            </div>
        </div>
    `);
}

function confirmPayment(itemId) {
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    if (!selectedAddress) {
        alert('请选择收货地址');
        return;
    }
    const addressId = selectedAddress.value;
    showPaymentMethodModal(itemId, addressId);
}

function saveNewAddress() {
    const recipient = document.getElementById('addr-recipient').value.trim();
    const phone = document.getElementById('addr-phone').value.trim();
    const detail = document.getElementById('addr-detail').value.trim();
    const token = localStorage.getItem('token');

    if (!recipient || !phone || !detail) {
        alert('请填写完整地址信息');
        return;
    }

    fetch('http://127.0.0.1:8000/api/add-address', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${token}`
        },
        body: JSON.stringify({
            recipient,
            phone,
            detail_address: detail
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('地址添加成功');
            document.getElementById('add-address-modal').remove();
            const itemId = window.currentItemId;
            showPurchaseModal(itemId);
        } else {
            alert(data.message || '添加失败');
        }
    })
    .catch(error => {
        alert(`保存地址失败: ${error.message}`);
    });
}

function showPaymentMethodModal(itemId, addressId) {
    document.getElementById('purchase-modal').remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" id="payment-method-modal" onclick="this.remove()">
            <div class="auth-card" onclick="event.stopPropagation()" style="width: 400px;">
                <div style="text-align:right;">
                    <button onclick="document.getElementById('payment-method-modal').remove()"
                        style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                </div>
                <h3>选择支付方式</h3>
                <div style="margin: 30px 0; display: flex; flex-direction: column; gap: 20px;">
                    <!-- 绿色支付选项 -->
                    <div
                        onclick="startPayment('green', ${itemId}, ${addressId})"
                        style="padding: 20px; border: 2px solid #4CAF50; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;"
                    >
                        <div style="width: 30px; height: 30px; background-color: #4CAF50; border-radius: 50%;"></div>
                        <span style="font-size: 18px;">绿色支付</span>
                    </div>

                    <!-- 蓝色支付选项 -->
                    <div
                        onclick="startPayment('blue', ${itemId}, ${addressId})"
                        style="padding: 20px; border: 2px solid #2196F3; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;"
                    >
                        <div style="width: 30px; height: 30px; background-color: #2196F3; border-radius: 50%;"></div>
                        <span style="font-size: 18px;">蓝色支付</span>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function startPayment(method, itemId, addressId) {
    document.getElementById('payment-method-modal').remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" id="payment-loading-modal" onclick="this.remove()">
            <div class="auth-card" onclick="event.stopPropagation()" style="width: 300px; text-align: center;">
                <div style="margin: 40px 0;">
                    <div style="width: 50px; height: 50px; margin: 0 auto; border-radius: 50%; border: 5px solid #f3f3f3; border-top: 5px solid ${method === 'green' ? '#4CAF50' : '#2196F3'}; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 20px; font-size: 18px;">支付中...</p>
                </div>
            </div>
        </div>
    `);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // 2秒后执行实际购买请求
    setTimeout(() => {
        const loginInfo = JSON.parse(localStorage.getItem('loginInfo'));
        if (!loginInfo || !loginInfo.user_id) {
            alert('用户信息获取失败');
            return;
        }

        fetch('http://127.0.0.1:8000/api/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                item_id: itemId,
                buyer_id: loginInfo.user_id,
                address_id: addressId
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('payment-loading-modal').remove();

            if (data.success) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="auth-modal" id="payment-success-modal" onclick="this.remove()">
                        <div class="auth-card" onclick="event.stopPropagation()" style="width: 300px; text-align: center;">
                            <div style="margin: 40px 0;">
                                <div style="width: 60px; height: 60px; margin: 0 auto; border-radius: 50%; background-color: ${method === 'green' ? '#4CAF50' : '#2196F3'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 30px;">✓</div>
                                <p style="margin-top: 20px; font-size: 20px; color: ${method === 'green' ? '#4CAF50' : '#2196F3'}; font-weight: bold;">支付完成</p>
                                <p style="margin-top: 10px; color: #666;">订单创建成功</p>
                            </div>
                            <button class="edit-btn" onclick="document.getElementById('payment-success-modal').remove(); showItems();">
                                完成
                            </button>
                        </div>
                    </div>
                `);
            } else {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="auth-modal" id="payment-fail-modal" onclick="this.remove()">
                        <div class="auth-card" onclick="event.stopPropagation()" style="width: 300px; text-align: center;">
                            <div style="margin: 40px 0;">
                                <div style="width: 60px; height: 60px; margin: 0 auto; border-radius: 50%; background-color: #ff4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 30px;">✗</div>
                                <p style="margin-top: 20px; font-size: 20px; color: #ff4444; font-weight: bold;">支付失败</p>
                                <p style="margin-top: 10px; color: #666;">${data.message || '请重试'}</p>
                            </div>
                            <button class="edit-btn" onclick="document.getElementById('payment-fail-modal').remove();">
                                关闭
                            </button>
                        </div>
                    </div>
                `);
            }
        })
        .catch(error => {
            document.getElementById('payment-loading-modal').remove();
            alert(`支付请求失败: ${error.message}`);
        });
    }, 2000);
}

function purchaseItem(itemId) {
    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) {
        alert('请先登录才能购买商品');
        showLogin();
        return;
    }

    const loginInfo = JSON.parse(loginInfoStr);

    fetch(`http://127.0.0.1:8000/api/purchase`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            item_id: itemId,
            buyer_id: loginInfo.user_id
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`购买失败 (状态码: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('购买成功！');
            showItems();
        } else {
            alert(`购买失败：${data.message || '未知错误'}`);
        }
    })
    .catch(error => {
        alert(`购买请求失败：${error.message}`);
    });
}

function submitItem() {
    const title = document.getElementById('itemTitle').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const description = document.getElementById('itemDescription').value.trim();
    const categoryId = document.getElementById('itemCategory').value; // 注意：这里直接取值，不再用parseInt

    if (!title) {
        alert('请输入商品标题');
        return;
    }
    if (isNaN(price) || price <= 0) {
        alert('请输入有效的价格（大于0）');
        return;
    }
    if (isNaN(quantity) || quantity < 1) {
        alert('请输入有效的数量（至少1）');
        return;
    }
    if (!categoryId) {
        alert('请选择商品类别');
        return;
    }
    const loginInfoStr = localStorage.getItem('loginInfo');
    const loginInfo = JSON.parse(loginInfoStr);
    const sellerId = loginInfo.user_id;
    const itemData = {
        title: title,
        description: description,
        price: price,
        quantity: quantity,
        category_id: parseInt(categoryId),
        seller_id: sellerId
    };

    fetch('http://127.0.0.1:8000/api/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(itemData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`发布失败 (状态码: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('商品发布成功！');
            showItems();
        } else {
            alert(`发布失败：${data.message || '未知错误'}`);
        }
    })
    .catch(error => {
        alert(`发布请求失败：${error.message}`);
    });
}

let currentMyTab = 'info';  // info / orders / addresses

function showMe() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="my-panel">
            <div class="my-sidebar">
                <div class="my-tab active" onclick="switchMyTab(this, 'info')">我的信息</div>
                <div class="my-tab" onclick="switchMyTab(this, 'orders')">我的订单</div>
                <div class="my-tab" onclick="switchMyTab(this, 'sold')">我卖出的</div>
                <div class="my-tab" onclick="switchMyTab(this, 'addresses')">我的收货地址</div>
            </div>
            <div class="my-content" id="my-content-area"></div>
        </div>
    `;
    loadUserInfo();
}

function switchMyTab(element, tabName) {
    document.querySelectorAll('.my-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    element.classList.add('active');
    if (tabName === 'info') loadUserInfo();
    else if (tabName === 'orders') loadUserOrders();
    else if (tabName === 'sold') loadSoldItems();
    else if (tabName === 'addresses') loadUserAddresses();
}

function loadUserInfo() {
    fetch('http://127.0.0.1:8000/api/user-info', {
        headers: { Authorization: `bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        const u = data.user;
        document.getElementById('my-content-area').innerHTML = `
            <div class="info-card">
                <div class="info-row"><span class="info-label">账号名称</span><span class="info-value">${u.username}</span></div>
                <div class="info-row"><span class="info-label">真实姓名</span><span class="info-value">${u.real_name}</span></div>
                <div class="info-row"><span class="info-label">我的电话</span><span class="info-value">${u.phone}</span></div>
                <div class="info-row"><span class="info-label">我的邮箱</span><span class="info-value">${u.email}</span></div>
                <button class="edit-btn" onclick="showChangePassword()">修改密码</button>
            </div>
        `;
    });
}

function showChangePassword() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" id="change-pwd-modal" onclick="closeChangePwd()">
            <div class="auth-card" onclick="event.stopPropagation()">
                <div style="text-align:right;">
                    <button onclick="closeChangePwd()"
                        style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                </div>
                <h3>修改密码</h3>
                <input id="cp-username" placeholder="账户"><br><br>
                <input type="password" id="cp-old" placeholder="当前密码"><br><br>
                <input type="password" id="cp-new" placeholder="新密码"><br><br>
                <input type="password" id="cp-confirm" placeholder="重复新密码"><br><br>
                <button class="edit-btn" onclick="submitChangePassword()">保存</button>
            </div>
        </div>
    `);
}

function closeChangePwd() {
    const modal = document.getElementById('change-pwd-modal');
    if (modal) modal.remove();
}

function submitChangePassword() {
    const u = document.getElementById('cp-username').value.trim();
    const oldPwd = document.getElementById('cp-old').value;
    const newPwd = document.getElementById('cp-new').value;
    const confirmPwd = document.getElementById('cp-confirm').value;

    if (!u || !oldPwd || !newPwd || !confirmPwd) {
        alert('请填写完整');
        return;
    }
    if (newPwd !== confirmPwd) {
        alert('两次密码不一致');
        return;
    }
    if (newPwd.length < 6) {
        alert('密码至少6位');
        return;
    }

    fetch('http://127.0.0.1:8000/api/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            username: u,
            old_password: oldPwd,
            new_password: newPwd
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('密码修改成功，请重新登录');
            document.getElementById('change-pwd-modal')?.remove();
            logout();
        } else {
            alert(data.message || '修改失败');
        }
    })
    .catch(err => {
        alert('请求失败');
        console.error(err);
    });
}

function loadUserOrders(statusFilter = '', sortBy = 'date_desc') {
    let url = 'http://127.0.0.1:8000/api/user-orders?';
    const params = [];
    if (statusFilter) params.push(`status=${statusFilter}`);
    if (sortBy) params.push(`sort=${sortBy}`);
    if (params.length > 0) url += params.join('&');

    fetch(url, {
        headers: { Authorization: `bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        let html = '';

        html += `
            <div class="filter-container">
                <div class="filter-row">
                    <div class="filter-item">
                        <label>订单状态:</label>
                        <select id="order-status-filter" onchange="filterOrders()">
                            <option value="">全部状态</option>
                            <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>待处理</option>
                            <option value="shipped" ${statusFilter === 'shipped' ? 'selected' : ''}>已发货</option>
                            <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>已完成</option>
                        </select>
                    </div>
                    <div class="filter-item">
                        <label>排序方式:</label>
                        <select id="order-sort" onchange="filterOrders()">
                            <option value="date_desc" ${sortBy === 'date_desc' ? 'selected' : ''}>最新订单</option>
                            <option value="date_asc" ${sortBy === 'date_asc' ? 'selected' : ''}>最早订单</option>
                            <option value="price_asc" ${sortBy === 'price_asc' ? 'selected' : ''}>价格从低到高</option>
                            <option value="price_desc" ${sortBy === 'price_desc' ? 'selected' : ''}>价格从高到低</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        if (data.success && data.orders && data.orders.length > 0) {
            data.orders.forEach(o => {
                let statusClass = '';
                let actionButton = '';

                switch(o.status) {
                    case 'pending':
                        statusClass = 'status-pending';
                        // 仅对待处理订单显示确认收货按钮
                        actionButton = `<button class="confirm-btn" onclick="confirmReceipt(${o.order_id})">确认收货</button>`;
                        break;
                    case 'shipped':
                        statusClass = 'status-shipped';
                        actionButton = `<button class="confirm-btn" onclick="confirmReceipt(${o.order_id})">确认收货</button>`;
                        break;
                    case 'completed':
                        statusClass = 'status-completed';
                        actionButton = '<span class="completed-text">交易已完成</span>';
                        break;
                }

                html += `
                    <div class="order-item">
                        <div class="order-info">
                            <span>${o.item_title}</span>
                            <span>日期: ${o.order_date}</span>
                            <span>价格: ¥${o.amount.toFixed(2)}</span>
                            <span class="order-status ${statusClass}">${o.status}</span>
                            ${actionButton}
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div style="color:#888; margin-top:20px;">暂无订单</div>';
        }
        document.getElementById('my-content-area').innerHTML = html;
    });
}

function filterOrders() {
    const status = document.getElementById('order-status-filter').value;
    const sort = document.getElementById('order-sort').value;
    loadUserOrders(status, sort);
}
function confirmReceipt(orderId) {
    if (!confirm('确认已经收到商品吗？')) {
        return;
    }

    fetch('http://127.0.0.1:8000/api/confirm-receipt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            order_id: orderId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`操作失败 (状态码: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('确认收货成功！');
            const statusFilter = document.getElementById('order-status-filter').value;
            const sortBy = document.getElementById('order-sort').value;
            loadUserOrders(statusFilter, sortBy);
        } else {
            alert(`操作失败：${data.message || '未知错误'}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}

function filterSoldItems() {
    const status = document.getElementById('sold-status-filter').value;
    const sort = document.getElementById('sold-sort').value;
    loadSoldItems(status, sort);
}

function loadSoldItems(statusFilter = '', sortBy = 'date_desc') {
    let url = 'http://127.0.0.1:8000/api/sold-items?';
    const params = [];
    if (statusFilter) params.push(`status=${statusFilter}`);
    if (sortBy) params.push(`sort=${sortBy}`);
    if (params.length > 0) url += params.join('&');

    fetch(url, {
        headers: { Authorization: `bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        let html = '';

        // 添加筛选和排序控件
        html += `
            <div class="filter-container">
                <div class="filter-row">
                    <div class="filter-item">
                        <label>商品状态:</label>
                        <select id="sold-status-filter" onchange="filterSoldItems()">
                            <option value="">全部状态</option>
                            <option value="available" ${statusFilter === 'available' ? 'selected' : ''}>在售</option>
                            <option value="ordered" ${statusFilter === 'ordered' ? 'selected' : ''}>待送货</option>
                            <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>已完成</option>
                        </select>
                    </div>
                    <div class="filter-item">
                        <label>排序方式:</label>
                        <select id="sold-sort" onchange="filterSoldItems()">
                            <option value="date_desc" ${sortBy === 'date_desc' ? 'selected' : ''}>最新发布</option>
                            <option value="date_asc" ${sortBy === 'date_asc' ? 'selected' : ''}>最早发布</option>
                            <option value="price_asc" ${sortBy === 'price_asc' ? 'selected' : ''}>价格从低到高</option>
                            <option value="price_desc" ${sortBy === 'price_desc' ? 'selected' : ''}>价格从高到低</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        if (data.success && data.items && data.items.length > 0) {
            data.items.forEach(item => {
                // 转换状态为中文显示文本
                let statusText = '';
                switch(item.status) {
                    case 'available':
                        statusText = '在售';
                        break;
                    case 'ordered':
                        statusText = '待送货';
                        break;
                    case 'completed':
                        statusText = '已完成';
                        break;
                    default:
                        statusText = item.status;
                }
                const cancelButton = item.status === 'available' ? `
                    <button class="cancel-btn" onclick="cancelItem(${item.item_id})">
                        取消
                    </button>
                ` : '';
                html += `
                    <div class="order-item">
                        <div class="order-info">
                            <span>${item.title}</span>
                            <span>价格: ¥${item.price.toFixed(2)}</span>
                            <span>发布时间: ${item.publish_date}</span>
                            <span class="order-status" data-status="${item.status}">
                                ${statusText}
                            </span>
                            ${cancelButton}
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div style="color:#888;">暂无卖出的商品</div>';
        }
        document.getElementById('my-content-area').innerHTML = html;
    });
}

function cancelItem(itemId) {
    if (confirm('确定要取消该商品吗？此操作将删除商品及所有关联订单！')) {
        fetch(`http://127.0.0.1:8000/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('商品已成功取消');
                loadSoldItems();
            } else {
                alert(`取消失败: ${data.message || '未知错误'}`);
            }
        })
        .catch(error => {
            alert(`操作失败: ${error.message}`);
        });
    }
}

function loadUserAddresses() {
    fetch('http://127.0.0.1:8000/api/user-addresses', {
        headers: { Authorization: `bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        let html = `
            <div style="text-align:right;margin-bottom:15px;">
                <button class="edit-btn" onclick="showAddAddress()">+ 点击添加地址</button>
            </div>
        `;

        if (!data.addresses || data.addresses.length === 0) {
            html += `<div style="color:#888;">暂无收货地址</div>`;
        } else {
            data.addresses.forEach(a => {
                html += `
                    <div class="address-item">
                        <div class="addr-row">
                            <span class="addr-label">收件人：</span>
                            <span class="addr-value">${a.recipient}</span>
                        </div>
                        <div class="addr-row">
                            <span class="addr-label">手机号：</span>
                            <span class="addr-value">${a.phone}</span>
                        </div>
                        <div class="addr-row">
                            <span class="addr-label">详细地址：</span>
                            <span class="addr-value">${a.detail_address}</span>
                        </div>
                    </div>
                `;
            });
        }

        document.getElementById('my-content-area').innerHTML = html;
    });
}


function showAddAddress() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" onclick="this.remove()">
            <div class="auth-card" onclick="event.stopPropagation()">
                <div style="text-align:right;">
                    <button onclick="this.closest('.auth-modal').remove()"
                        style="background:none;border:none;font-size:18px;cursor:pointer;">×</button>
                </div>
                <h3>添加收货地址</h3>
                <input id="addr-recipient" placeholder="收货人"><br><br>
                <input id="addr-phone" placeholder="手机号"><br><br>
                <textarea id="addr-detail" placeholder="详细地址" style="width:100%;height:80px;"></textarea><br><br>

                <button class="edit-btn" onclick="submitAddAddress()">保存</button>
            </div>
        </div>
    `);
}

function submitAddAddress() {
    const recipient = document.getElementById('addr-recipient').value.trim();
    const phone = document.getElementById('addr-phone').value.trim();
    const detail = document.getElementById('addr-detail').value.trim();

    if (!recipient || !phone || !detail) {
        alert('请填写完整地址信息');
        return;
    }

    fetch('http://127.0.0.1:8000/api/add-address', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            recipient,
            phone,
            detail_address: detail
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('地址添加成功');
            document.querySelector('.auth-modal').remove();
            loadUserAddresses();   // 刷新地址列表
        } else {
            alert(data.message || '添加失败');
        }
    });
}

function logout() {
    loggedIn = false;
    localStorage.removeItem('loginInfo');
    localStorage.removeItem('token');
    //document.getElementById('admin-modal').style.display = 'none';
    document.getElementById('center-buttons').style.display = 'flex';
    document.getElementById('nav-box').style.display = 'none';
    document.getElementById('content').innerHTML = '';
    alert('已退出登录');

    document.getElementById('content').innerHTML = '';
    window.location.reload();
}

function adminLogout() {
    document.getElementById('admin-modal').style.display = 'none';
    logout();
}

function showAdminInfo() {
    const loginInfo = JSON.parse(localStorage.getItem('loginInfo') || '{}');
    if (loginInfo.role === 'admin') {
        alert(`
            管理员信息：
            账号：${loginInfo.username}
            管理员ID：${loginInfo.user_id}
            姓名：${loginInfo.real_name}
        `);
    }
}

function manageUserInfo(searchMode = 'username', searchValue = '') {
    const itemSearchContainer = document.getElementById('item-search-container');
    const userSearchContainer = document.getElementById('user-search-container');
    const panelTitle = document.querySelector('.panel-title');
    itemSearchContainer.classList.remove('active');
    userSearchContainer.classList.add('active');
    panelTitle.textContent = '管理用户信息';
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = '<p style="color: #666; text-align: center; padding: 50px;">加载用户信息中...</p>';

    const loginInfoStr = localStorage.getItem('loginInfo');
    if (!loginInfoStr) {
        adminContent.innerHTML = '<p style="color: #ff0000; text-align: center; padding: 50px;">请先登录</p>';
        return;
    }

    let searchParams = new URLSearchParams();
    if (searchValue.trim()) {
        searchParams.append('mode', searchMode);
        searchParams.append('value', searchValue);
    }

    fetch(`http://127.0.0.1:8000/api/admin/users?${searchParams.toString()}`, {
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('获取用户信息失败');
        return response.json();
    })
    .then(data => {
        if (data.success && data.users && data.users.length > 0) {
            let html = `
                <div style="font-size: 14px; border-collapse: collapse; width: 100%;">
                    <div style="display: flex; font-weight: bold; padding: 10px; background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                        <div style="width: 10%;">用户ID</div>
                        <div style="width: 15%;">用户名</div>
                        <div style="width: 15%;">真实姓名</div>
                        <div style="width: 15%;">手机号</div>
                        <div style="width: 20%;">邮箱</div>
                        <div style="width: 10%;">角色</div>
                        <div style="width: 15%;">操作</div>
                    </div>
            `;

            data.users.forEach(user => {
                const isAdmin = user.role === 'admin';
                const manageBtn = isAdmin
                    ? `<button class="edit-btn" style="padding: 4px 8px; font-size: 12px; background-color: #ccc; cursor: not-allowed; border: none; border-radius: 4px;"
                              onclick="alert('无权限操作管理员账户')">管理</button>`
                    : `<button class="edit-btn" style="padding: 4px 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;"
                              onclick="openUserEditModal(${user.user_id})">管理</button>`;

                html += `
                    <div style="display: flex; padding: 8px; border-bottom: 1px solid #eee; align-items: center;">
                        <div style="width: 10%;">${user.user_id}</div>
                        <div style="width: 15%;">${user.username}</div>
                        <div style="width: 15%;">${user.real_name || '-'}</div>
                        <div style="width: 15%;">${user.phone || '-'}</div>
                        <div style="width: 20%;">${user.email || '-'}</div>
                        <div style="width: 10%;">${user.role || 'user'}</div>
                        <div style="width: 15%; display: flex; justify-content: center; align-items: center;">
                            ${manageBtn}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            adminContent.innerHTML = html;
        } else {
            adminContent.innerHTML = `<p style="color: #666; text-align: center; padding: 50px;">${data.message || '暂无用户信息'}</p>`;
        }
    })
    .catch(error => {
        adminContent.innerHTML = `<p style="color: #ff0000; text-align: center; padding: 50px;">加载失败: ${error.message}</p>`;
    });
}

let originalUserData = {};
function openUserEditModal(userId) {
    fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const user = data.user;
            originalUserData = { ...user };

            const modalHtml = `
                <div class="user-edit-modal" id="user-edit-modal">
                    <div class="user-edit-card">
                        <button class="delete-user-btn" onclick="deleteUser(${userId})">删除用户信息</button>
                        <h3 style="margin-top: 0;">编辑用户信息</h3>

                        <div class="user-form-item">
                            <label>用户ID</label>
                            <input type="text" id="edit-user-id" value="${user.user_id}" disabled>
                        </div>
                        <div class="user-form-item">
                            <label>用户名</label>
                            <input type="text" id="edit-username" value="${user.username}" >
                        </div>
                        <div class="user-form-item">
                            <label>真实姓名</label>
                            <input type="text" id="edit-realname" value="${user.real_name || ''}">
                        </div>
                        <div class="user-form-item">
                            <label>手机号</label>
                            <input type="text" id="edit-phone" value="${user.phone || ''}">
                        </div>
                        <div class="user-form-item">
                            <label>邮箱</label>
                            <input type="text" id="edit-email" value="${user.email || ''}">
                        </div>
                        <div class="user-form-item">
                            <label>角色</label>
                            <input type="text" id="edit-role" value="${user.role || 'user'}" disabled>
                        </div>

                        <div class="modal-btn-group">
                            <button class="save-btn" onclick="saveUserEdit(${userId})">保存</button>
                            <button class="cancel-btn" onclick="closeUserEditModal()">取消</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            alert(`获取用户信息失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`加载失败：${error.message}`);
    });
}
function closeUserEditModal() {
    const modal = document.getElementById('user-edit-modal');
    if (modal) modal.remove();
    originalUserData = {};
}
function saveUserEdit(userId) {
    const updatedData = {
        username: document.getElementById('edit-username').value,
        real_name: document.getElementById('edit-realname').value,
        phone: document.getElementById('edit-phone').value,
        email: document.getElementById('edit-email').value
    };

    fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('用户信息修改成功！');
            closeUserEditModal();
            manageUserInfo();
        } else {
            alert(`修改失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}
function deleteUser(userId) {
    if (!confirm('确认删除此用户？删除后将同时删除该用户的订单、日志、商品等所有关联数据！')) {
        return;
    }

    fetch(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('用户及关联数据已成功删除！');
            closeUserEditModal();
            manageUserInfo();
        } else {
            alert(`删除失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}

function manageProductInfo(searchMode = 'item_id', searchValue = '', sortMode = 'create_time', sortDirection = 'desc') {
    const itemSearchContainer = document.getElementById('item-search-container');
    const userSearchContainer = document.getElementById('user-search-container');
    const panelTitle = document.querySelector('.panel-title');

    userSearchContainer.classList.remove('active');
    itemSearchContainer.classList.add('active');
    panelTitle.textContent = '管理商品信息';

    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = '<p style="color: #666; text-align: center; padding: 50px;">加载商品信息中...</p>';

    let searchParams = new URLSearchParams();
    if (searchValue.trim()) {
        searchParams.append('mode', searchMode);
        searchParams.append('value', searchValue);
    }
    searchParams.append('sort', sortMode);

    fetch(`http://127.0.0.1:8000/api/admin/items?${searchParams.toString()}`, {
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('获取商品信息失败');
        return response.json();
    })
    .then(data => {
        if (data.success && data.items && data.items.length > 0) {
            let html = `
                <div style="font-size: 14px; border-collapse: collapse; width: 100%;">
                    <div style="display: flex; font-weight: bold; padding: 10px; background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                        <div style="width: 10%;">商品ID</div>
                        <div style="width: 20%;">商品名称</div>
                        <div style="width: 10%;">价格</div>
                        <div style="width: 10%;">卖家ID</div>
                        <div style="width: 15%;">商品状态</div>
                        <div style="width: 20%;">创建时间</div>
                        <div style="width: 5%;">操作</div>
                    </div>
            `;

            data.items.forEach(item => {
                // 状态映射
                const statusText = item.status === 'available'
                    ? '在售'
                    : (item.status === 'ordered' ? '售出' : (item.status === 'completed' ? '完成' : '未知状态'));
                const manageBtn = `<button class="edit-btn" style="padding: 4px 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;"
                          onclick="openItemEditModal(${item.item_id})">管理</button>`;

                html += `
                    <div style="display: flex; padding: 8px; border-bottom: 1px solid #eee; align-items: center;">
                        <div style="width: 10%;">${item.item_id}</div>
                        <div style="width: 20%;">${item.item_name}</div>
                        <div style="width: 10%;">¥${item.price}</div>
                        <div style="width: 10%;">${item.seller_id}</div>
                        <div style="width: 15%;">${statusText}</div>
                        <div style="width: 20%;">${item.create_time}</div>
                        <div style="width: 5%; display: flex; justify-content: center; align-items: center;">
                            ${manageBtn}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            adminContent.innerHTML = html;
        } else {
            adminContent.innerHTML = `<p style="color: #666; text-align: center; padding: 50px;">${data.message || '暂无商品信息'}</p>`;
        }
    })
    .catch(error => {
        adminContent.innerHTML = `<p style="color: #ff0000; text-align: center; padding: 50px;">加载失败: ${error.message}</p>`;
    });
}

// 存储原始商品数据，用于取消时恢复
let originalItemData = {};

function openItemEditModal(itemId) {
    fetch(`http://127.0.0.1:8000/api/admin/items/${itemId}`, {
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const item = data.item;
            originalItemData = { ...item }; // 保存原始数据

            let statusBtnHtml = '';
            if (item.status === 'available') {
                statusBtnHtml = `<button class="item-status-btn down-btn" onclick="downItem(${itemId})">下架</button>`;
            } else {
                statusBtnHtml = `<button class="item-status-btn refund-btn" onclick="refundItem(${itemId})">退货退款</button>`;
            }

            const modalHtml = `
                <div class="item-edit-modal" id="item-edit-modal">
                    <div class="item-edit-card">
                        ${statusBtnHtml}
                        <h3 style="margin-top: 0;">编辑商品信息</h3>

                        <div class="item-form-item">
                            <label>商品ID</label>
                            <input type="text" id="edit-item-id" value="${item.item_id}" disabled>
                        </div>
                        <div class="item-form-item">
                            <label>商品名称</label>
                            <input type="text" id="edit-item-name" value="${item.item_name || ''}">
                        </div>
                        <div class="item-form-item">
                            <label>商品价格（元）</label>
                            <input type="number" id="edit-price" value="${item.price || 0}" disabled>
                        </div>
                        <div class="item-form-item">
                            <label>卖家ID</label>
                            <input type="text" id="edit-seller-id" value="${item.seller_id}" disabled>
                        </div>
                        <div class="item-form-item">
                            <label>商品状态</label>
                            <select id="edit-status">
                                <option value="available" ${item.status === 'available' ? 'selected' : ''}>在售</option>
                                <option value="ordered" ${item.status === 'ordered' ? 'selected' : ''}>售出</option>
                                <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>完成</option>
                            </select>
                        </div>
                        <div class="item-form-item">
                            <label>创建时间</label>
                            <input type="text" id="edit-create-time" value="${item.create_time || ''}" disabled>
                        </div>
                        <div class="item-form-item">
                            <label>商品描述</label>
                            <input type="text" id="edit-description" value="${item.description || ''}">
                        </div>
                        <div class="item-form-item">
                            <label>浏览量</label>
                            <input type="number" id="edit-view-count" value="${item.view_count || 0}" disabled>
                        </div>

                        <div class="modal-btn-group">
                            <button class="save-btn" onclick="saveItemEdit(${itemId})">保存</button>
                            <button class="cancel-btn" onclick="closeItemEditModal()">取消</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            alert(`获取商品信息失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`加载失败：${error.message}`);
    });
}

function closeItemEditModal() {
    const modal = document.getElementById('item-edit-modal');
    if (modal) modal.remove();
    originalItemData = {};
}

function saveItemEdit(itemId) {
    const updatedData = {
        item_name: document.getElementById('edit-item-name').value,
        price: parseFloat(document.getElementById('edit-price').value),
        status: document.getElementById('edit-status').value,
        description: document.getElementById('edit-description').value,
        view_count: parseInt(document.getElementById('edit-view-count').value) || 0
    };
    if (!updatedData.item_name.trim()) {
        alert('商品名称不能为空！');
        return;
    }
    if (updatedData.price <= 0) {
        alert('商品价格必须大于0！');
        return;
    }
    fetch(`http://127.0.0.1:8000/api/admin/items/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('商品信息修改成功！');
            closeItemEditModal();
            manageProductInfo();
        } else {
            alert(`修改失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}

// 下架商品
function downItem(itemId) {
    if (!confirm('确认下架此商品？下架后将永久删除该商品！')) {
        return;
    }
    fetch(`http://127.0.0.1:8000/api/admin/items/${itemId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('商品已成功下架（删除）！');
            closeItemEditModal();
            manageProductInfo();
        } else {
            alert(`下架失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}

// 退货退款（商品恢复为上架，删除关联订单）
function refundItem(itemId) {
    if (!confirm('确认执行退货退款？商品将恢复为在售状态，关联订单将被删除！')) {
        return;
    }

    fetch(`http://127.0.0.1:8000/api/admin/items/${itemId}/refund`, {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('退货退款处理成功！商品已恢复为在售，关联订单已删除');
            closeItemEditModal();
            manageProductInfo();
        } else {
            alert(`处理失败：${data.message}`);
        }
    })
    .catch(error => {
        alert(`请求失败：${error.message}`);
    });
}

// 处理异常交易
function handleAbnormalTransactions() {
    const itemSearchContainer = document.getElementById('item-search-container');
    const userSearchContainer = document.getElementById('user-search-container');
    const panelTitle = document.querySelector('.panel-title');

    itemSearchContainer.classList.remove('active');
    userSearchContainer.classList.remove('active');
    panelTitle.textContent = '处理异常交易';

    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = '<p style="color: #666; text-align: center; padding: 50px;">加载订单信息中...</p>';

    fetch('http://127.0.0.1:8000/api/admin/orders', {
        headers: {
            'Authorization': `bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('获取订单信息失败');
        return response.json();
    })
    .then(data => {
        if (data.success && data.orders && data.orders.length > 0) {
            let html = `
                <div style="font-size: 14px; border-collapse: collapse; width: 100%;">
                    <div style="display: flex; font-weight: bold; padding: 10px; background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                        <div style="width: 8%;">订单ID</div>
                        <div style="width: 10%;">买家ID</div>
                        <div style="width: 10%;">商品ID</div>
                        <div style="width: 20%;">商品名称</div>
                        <div style="width: 15%;">订单日期</div>
                        <div style="width: 12%;">状态</div>
                        <div style="width: 10%;">金额(元)</div>
                        <div style="width: 15%;">操作</div>
                    </div>
            `;

            data.orders.forEach(order => {
                let statusClass = '';
                switch(order.status) {
                    case 'pending':
                        statusClass = 'status-pending';
                        break;
                    case 'shipped':
                        statusClass = 'status-shipped';
                        break;
                    case 'completed':
                        statusClass = 'status-completed';
                        break;
                    default:
                        statusClass = 'status-abnormal';
                }

                html += `
                    <div style="display: flex; padding: 8px; border-bottom: 1px solid #eee; align-items: center;">
                        <div style="width: 8%;">${order.order_id}</div>
                        <div style="width: 10%;">${order.buyer_id}</div>
                        <div style="width: 10%;">${order.item_id}</div>
                        <div style="width: 20%;">${order.item_title}</div>
                        <div style="width: 15%;">${order.order_date}</div>
                        <div style="width: 12%;">
                            <span class="order-status ${statusClass}">${order.status}</span>
                        </div>
                        <div style="width: 10%;">¥${order.amount.toFixed(2)}</div>
                        <div style="width: 15%;">
                            <button class="edit-btn" onclick="handleOrderIssue(${order.order_id})">
                                处理异常
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            adminContent.innerHTML = html;
        } else {
            adminContent.innerHTML = `<p style="color: #666; text-align: center; padding: 50px;">${data.message || '暂无订单信息'}</p>`;
        }
    })
    .catch(error => {
        adminContent.innerHTML = `<p style="color: #ff0000; text-align: center; padding: 50px;">加载失败: ${error.message}</p>`;
    });
}

// 处理订单异常不写了
function handleOrderIssue(orderId) {
    alert(`处理订单 ${orderId} 的异常`);
}
function showAdminInfo() {
    const itemSearchContainer = document.getElementById('item-search-container');
    const userSearchContainer = document.getElementById('user-search-container');
    const panelTitle = document.querySelector('.panel-title');

    itemSearchContainer.classList.remove('active');
    userSearchContainer.classList.remove('active');
    panelTitle.textContent = '管理员信息';

    const loginInfo = JSON.parse(localStorage.getItem('loginInfo') || '{}');
    let infoHtml = '';
    if (loginInfo.role === 'admin') {
        infoHtml = `
            <div style="font-size: 16px; line-height: 2; padding: 20px; text-align: center;">
                <p><strong>管理员信息</strong></p>
                <p>账号：${loginInfo.username}</p>
                <p>管理员ID：${loginInfo.user_id}</p>
                <p>姓名：${loginInfo.real_name}</p>
            </div>
        `;
    } else {
        infoHtml = '<p style="color: #ff0000; text-align: center; padding: 50px;">非管理员账户，无权限查看</p>';
    }
    document.getElementById('admin-content').innerHTML = infoHtml;
}