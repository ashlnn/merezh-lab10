// Отримання посилань на DOM-елементи
const inputCartId = document.querySelector('#cartInput');
const btnFetch = document.querySelector('#fetchCartBtn');
const statusInfo = document.querySelector('#requestStatus');
const errorContainer = document.querySelector('#errorMessage');
const cartContainer = document.querySelector('#cartDetails');
const testModeCheckbox = document.querySelector('#testRetryMode');

console.log('Скрипт успішно підключено до сторінки.');

// Функція для створення затримки (паузи в мс)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функція запиту з підтримкою повторної спроби (retry)
async function requestWithRetry(id, isTestMode) {
  const maxAttempts = 2;
  const selectedMode = document.querySelector('input[name="requestMode"]:checked').value;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Відображення номера поточної спроби
      statusInfo.textContent = `Спроба ${attempt} із ${maxAttempts}. Завантаження кошика… Будь ласка, зачекайте.`;

      // Якщо увімкнено тестовий чекбокс і це 1-а спроба — штучно кидаємо помилку
      if (isTestMode && attempt === 1) {
        throw new Error('Штучна помилка першої спроби (тестовий режим)');
      }

      let url = '';
      if (selectedMode === 'success') {
        url = `https://dummyjson.com/carts/${id}?delay=3000`;
      } else if (selectedMode === '404') {
        url = 'https://dummyjson.com/http/404/Not_Found';
      } else if (selectedMode === '503') {
        url = 'https://dummyjson.com/http/503/Service_Unavailable';
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Сервер повернув статус: ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      return data; // Успіх — повертаємо дані

    } catch (err) {
      console.warn(`Спроба ${attempt} завершилася невдало:`, err.message);

      // Якщо це остання спроба — кидаємо помилку далі
      if (attempt === maxAttempts) {
        throw new Error(`Усі спроби вичерпано. Остання помилка: ${err.message}`);
      }

      // Якщо це перша спроба — робимо паузу 1000 мс перед наступною
      errorContainer.textContent = `Спроба ${attempt} не вдалася. Повторний запит через 1 секунду...`;
      await wait(1000);
      errorContainer.textContent = ''; // Очищаємо проміжне повідомлення
    }
  }
}

// Головна обгортка для запуску завантаження
async function loadCart() {
  const id = inputCartId.value.trim();
  const isTestMode = testModeCheckbox.checked;

  // Очищення попереднього стану
  errorContainer.textContent = '';
  cartContainer.innerHTML = '';

  if (!id) {
    errorContainer.textContent = 'Будь ласка, вкажіть коректний ідентифікатор!';
    return;
  }

  // Блокування кнопки на час виконання всіх спроб
  btnFetch.disabled = true;

  try {
    // Виклик функції з логікою повторних спроб
    const data = await requestWithRetry(id, isTestMode);

    // Відображення успішного результату
    statusInfo.textContent = `Дані кошика №${id} успішно отримано.`;
    renderCartInfo(data);

  } catch (err) {
    // Остаточна помилка після всіх невдалих спроб
    statusInfo.textContent = 'Помилка під час отримання даних.';
    errorContainer.textContent = err.message;
  } finally {
    // Розблокування кнопки після завершення операції
    btnFetch.disabled = false;
  }
}

// Функція для рендерингу даних про кошик (у вигляді списку)
function renderCartInfo(cart) {
  const itemsList = cart.products.map(item => `
    <li>
      <strong>${item.title}</strong> — ${item.quantity} шт. × $${item.price.toFixed(2)} = <strong>$${item.total.toFixed(2)}</strong>
    </li>
  `).join('');

  cartContainer.innerHTML = `
    <h2>Інформація про кошик №${cart.id}</h2>
    <p><strong>Загальна кількість товарів:</strong> ${cart.totalQuantity}</p>
    <p><strong>Загальна сума:</strong> $${cart.total.toFixed(2)} (зі знижкою: $${cart.discountedTotal.toFixed(2)})</p>
    <h3>Товари в кошику:</h3>
    <ul>${itemsList}</ul>
  `;
}

// Підключення події на кнопку
btnFetch.addEventListener('click', loadCart);