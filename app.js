// app.js - ДЛЯ GITHUB PAGES
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Глобальные переменные
let menu = {};
let additions = {};
let config = {};
let stopList = [];
let cart = [];
let currentItem = null;
let currentCategory = null;
let selectedSize = null;
let selectedAdditions = [];
let itemComment = '';

// ЗАМЕНИТЕ НА ВАШ URL С AMVERA
const API_URL = 'https://your-app-name.amvera.io';

// ============= ИНИЦИАЛИЗАЦИЯ =============

async function init() {
    console.log('Mini App инициализация...');
    console.log('API URL:', API_URL);

    try {
        // Загружаем данные с API
        const [menuResponse, additionsResponse, configResponse, stopListResponse] = await Promise.all([
            fetch(`${API_URL}/menu`),
            fetch(`${API_URL}/additions`),
            fetch(`${API_URL}/config`),
            fetch(`${API_URL}/stop_list`)
        ]);

        menu = await menuResponse.json();
        additions = await additionsResponse.json();
        config = await configResponse.json();
        stopList = await stopListResponse.json();

        // Отображаем категории
        renderCategories();

        // Отображаем первую категорию
        const firstCategory = Object.keys(menu)[0];
        selectCategory(firstCategory);

        // Генерируем временные слоты
        generateTimeSlots();

        console.log('Mini App успешно загружена!');

    } catch (error) {
        console.error('Ошибка загрузки:', error);
        tg.showAlert('Ошибка загрузки меню. Проверьте подключение к интернету.');
    }
}

// ============= КАТЕГОРИИ =============

function renderCategories() {
    const categoriesDiv = document.getElementById('categories');
    categoriesDiv.innerHTML = '';

    Object.keys(menu).forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = category;
        btn.onclick = () => selectCategory(category);
        categoriesDiv.appendChild(btn);
    });
}

function selectCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === category);
    });
    renderItems(category);
}

// ============= ТОВАРЫ =============

function renderItems(category) {
    const itemsDiv = document.getElementById('items');
    itemsDiv.innerHTML = '';

    const items = menu[category];

    Object.entries(items).forEach(([name, data]) => {
        const card = document.createElement('div');
        card.className = 'item-card';

        // Проверяем стоп-лист
        const isInStopList = stopList.some(item =>
            item.category === category && item.item_name === name
        );

        if (isInStopList) {
            card.innerHTML = `
                <img src="images/placeholder.png" alt="${name}" class="item-image">
                <div class="item-info">
                    <div class="item-name">${name}</div>
                    <div class="item-stop-list">⛔ В стоп-листе</div>
                </div>
            `;
            card.style.opacity = '0.6';
        } else {
            card.onclick = () => showItem(name, data, category);
            const basePrice = data.base_price;
            const priceText = data.sizes ? `от ${basePrice}₽` : `${basePrice}₽`;
            const imagePath = data.image ? `images/${data.image}` : 'images/placeholder.png';

            card.innerHTML = `
                <img src="${imagePath}" alt="${name}" class="item-image" onerror="this.src='images/placeholder.png'">
                <div class="item-info">
                    <div class="item-name">${name}</div>
                    <div class="item-price">${priceText}</div>
                </div>
            `;
        }

        itemsDiv.appendChild(card);
    });
}

// ============= СТРАНИЦА ТОВАРА =============

function showItem(name, data, category) {
    const isInStopList = stopList.some(item =>
        item.category === category && item.item_name === name
    );

    if (isInStopList) {
        tg.showAlert('⛔ Этот товар временно недоступен');
        return;
    }

    currentItem = { name, data, category };
    selectedSize = null;
    selectedAdditions = [];
    itemComment = '';

    document.getElementById('main-page').classList.remove('active');
    document.getElementById('item-page').classList.add('active');
    document.getElementById('item-title').textContent = name;

    renderSizes(data);
    renderAdditions();
    updateItemPrice();
}

function renderSizes(data) {
    const sizesDiv = document.getElementById('sizes');
    sizesDiv.innerHTML = '';

    if (data.sizes) {
        Object.entries(data.sizes).forEach(([size, extraPrice]) => {
            const totalPrice = data.base_price + extraPrice;
            const btn = document.createElement('button');
            btn.className = 'size-btn';
            btn.onclick = () => selectSize(size, totalPrice);
            btn.innerHTML = `
                <div class="size-name">${size}</div>
                <div class="size-price">${totalPrice}₽</div>
            `;
            sizesDiv.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'size-btn active';
        selectedSize = { name: 'standard', price: data.base_price };
        btn.innerHTML = `
            <div class="size-name">Стандарт</div>
            <div class="size-price">${data.base_price}₽</div>
        `;
        sizesDiv.appendChild(btn);
    }
}

function selectSize(sizeName, price) {
    selectedSize = { name: sizeName, price };
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.size-btn').classList.add('active');
    updateItemPrice();
}

// ============= ДОБАВКИ =============

function renderAdditions() {
    const additionsDiv = document.getElementById('additions');
    additionsDiv.innerHTML = '';

    const syrupBtn = createAdditionButton('🍯 Сироп', () => showSyrupModal());
    const cinnamonBtn = createAdditionButton(`🌿 Корица (+${additions['Корица'].price}₽)`, () => toggleAddition('Корица', additions['Корица'].price));
    const mintLemonBtn = createAdditionButton('🍃 Мята и лимон', () => showMintLemonModal());

    additionsDiv.appendChild(syrupBtn);
    additionsDiv.appendChild(cinnamonBtn);
    additionsDiv.appendChild(mintLemonBtn);
}

function createAdditionButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'addition-btn';
    btn.onclick = onClick;
    btn.innerHTML = `<span class="addition-name">${text}</span>`;
    return btn;
}

function toggleAddition(name, price) {
    const index = selectedAdditions.findIndex(a => a.name === name);
    if (index > -1) {
        selectedAdditions.splice(index, 1);
        event.target.classList.remove('active');
    } else {
        selectedAdditions.push({ name, price });
        event.target.classList.add('active');
    }
    updateItemPrice();
}

// ============= МОДАЛЬНЫЕ ОКНА =============

function showSyrupModal() {
    const modal = document.getElementById('syrup-modal');
    const list = document.getElementById('syrup-list');
    list.innerHTML = '';

    Object.entries(additions['Сироп'].items).forEach(([syrup, sizes]) => {
        Object.entries(sizes).forEach(([size, price]) => {
            const btn = document.createElement('button');
            btn.className = 'addition-btn';
            btn.onclick = () => {
                addSyrup(syrup, size, price);
                closeSyrupModal();
            };
            btn.innerHTML = `
                <span class="addition-name">${syrup} ${size}</span>
                <span class="addition-price">+${price}₽</span>
            `;
            list.appendChild(btn);
        });
    });
    modal.classList.add('active');
}

function closeSyrupModal() {
    document.getElementById('syrup-modal').classList.remove('active');
}

function addSyrup(syrup, size, price) {
    selectedAdditions.push({ name: `Сироп ${syrup} ${size}`, price });
    updateItemPrice();
}

function showMintLemonModal() {
    const modal = document.getElementById('mint-lemon-modal');
    const list = document.getElementById('mint-lemon-list');
    list.innerHTML = '';

    Object.entries(additions['Мята и лимон'].items).forEach(([name, price]) => {
        const btn = document.createElement('button');
        btn.className = 'addition-btn';
        btn.onclick = () => {
            selectedAdditions.push({ name, price });
            closeMintLemonModal();
            updateItemPrice();
        };
        btn.innerHTML = `
            <span class="addition-name">${name}</span>
            <span class="addition-price">+${price}₽</span>
        `;
        list.appendChild(btn);
    });
    modal.classList.add('active');
}

function closeMintLemonModal() {
    document.getElementById('mint-lemon-modal').classList.remove('active');
}

// ============= РАСЧЕТ ЦЕНЫ =============

function updateItemPrice() {
    if (!selectedSize) return;
    let total = selectedSize.price;
    selectedAdditions.forEach(a => total += a.price);
    document.getElementById('item-total').textContent = total;
}

// ============= КОРЗИНА =============

function addToCart() {
    if (!selectedSize) {
        tg.showAlert('Выберите размер');
        return;
    }

    const comment = document.getElementById('item-comment').value;
    const cartItem = {
        name: currentItem.name,
        size: selectedSize.name,
        price: selectedSize.price,
        additions: selectedAdditions.map(a => a.name),
        additionsPrice: selectedAdditions.reduce((sum, a) => sum + a.price, 0),
        comment
    };

    cartItem.totalPrice = cartItem.price + cartItem.additionsPrice;
    cart.push(cartItem);
    updateCartCount();
    tg.showAlert('Добавлено в корзину!');
    backToMain();
}

function updateCartCount() {
    document.getElementById('cart-count').textContent = cart.length;
}

function showCart() {
    document.getElementById('main-page').classList.remove('active');
    document.getElementById('item-page').classList.remove('active');
    document.getElementById('cart-page').classList.add('active');
    renderCart();
}

function renderCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🧺</div>
                <div>Корзина пуста</div>
            </div>
        `;
        document.querySelector('.cart-footer').style.display = 'none';
        return;
    }

    document.querySelector('.cart-footer').style.display = 'block';
    cartItemsDiv.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.totalPrice;
        const div = document.createElement('div');
        div.className = 'cart-item';
        const additionsText = item.additions.length > 0 ? `<div class="cart-item-details">+ ${item.additions.join(', ')}</div>` : '';
        const commentText = item.comment ? `<div class="cart-item-details">"${item.comment}"</div>` : '';
        div.innerHTML = `
            <div class="cart-item-header">
                <div class="cart-item-name">${item.name} ${item.size}</div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">🗑</button>
            </div>
            ${additionsText}
            ${commentText}
            <div class="cart-item-price">${item.totalPrice}₽</div>
        `;
        cartItemsDiv.appendChild(div);
    });

    document.getElementById('cart-total').textContent = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    renderCart();
}

// ============= ОФОРМЛЕНИЕ ЗАКАЗА =============

async function checkout() {
    if (cart.length === 0) {
        tg.showAlert('Корзина пуста');
        return;
    }

    const deliveryTime = document.getElementById('delivery-time').value;
    const orderComment = document.getElementById('order-comment').value;

    const items = cart.map(item => ({
        name: item.name,
        size: item.size,
        price: item.totalPrice,
        additions: item.additions,
        comment: item.comment
    }));

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    try {
        const response = await fetch(`${API_URL}/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: tg.initDataUnsafe.user.id,
                items,
                total,
                delivery_time: deliveryTime,
                order_comment: orderComment
            })
        });

        const data = await response.json();
        if (data.success) {
            tg.showAlert('Заказ отправлен! Ожидайте подтверждения.');
            cart = [];
            updateCartCount();
            backToMain();
        } else {
            tg.showAlert('Ошибка при оформлении заказа: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка оформления:', error);
        tg.showAlert('Ошибка при оформлении заказа');
    }
}

// ============= ВРЕМЕННЫЕ СЛОТЫ =============

function generateTimeSlots() {
    const select = document.getElementById('delivery-time');
    const now = new Date();
    const startHour = parseInt(config.working_hours.start.split(':')[0]);
    const endHour = parseInt(config.working_hours.end.split(':')[0]);

    now.setMinutes(now.getMinutes() + config.min_minutes_before);
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    now.setSeconds(0);

    const current = new Date(now);
    for (let i = 0; i < 12; i++) {
        if (current.getHours() >= startHour && current.getHours() < endHour) {
            const timeStr = current.toTimeString().substring(0, 5);
            const option = document.createElement('option');
            option.value = timeStr;
            option.textContent = timeStr;
            select.appendChild(option);
        }
        current.setMinutes(current.getMinutes() + 15);
    }
}

// ============= НАВИГАЦИЯ =============

function backToMain() {
    document.getElementById('item-page').classList.remove('active');
    document.getElementById('cart-page').classList.remove('active');
    document.getElementById('main-page').classList.add('active');
    document.getElementById('item-comment').value = '';
}

// ============= ЗАПУСК =============

document.addEventListener('DOMContentLoaded', init);
