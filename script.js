const apiUrl = "http://localhost:3001";
let currentUser = null;

const cartTableBody = document.querySelector("tbody");
const btnCheckout = document.querySelector(".btn-checkout");
const btnContinueShopping = document.querySelector(".btn-continue-shopping");
const cartTotalElement = document.createElement("div");
cartTotalElement.classList.add("cart-total");
//document.querySelector(".cart-actions").insertAdjacentElement("beforebegin", cartTotalElement);

//reg
document
  .getElementById("registerForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const username = document.getElementById("registerUsername").value;
    const password = document.getElementById("registerPassword").value;
    const email = document.getElementById("email").value;

    const response = await fetch(`${apiUrl}/users`);
    const users = await response.json();

    if (users.find((user) => user.username === username)) {
      alert("Username already exists");
      return;
    }

    const hashedPassword = btoa(password);
    const newUser = { username, password: hashedPassword, email };

    await fetch(`${apiUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });

    alert("User registered successfully");
  });

//login
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch(`${apiUrl}/users`);
    const users = await response.json();

    const user = users.find((user) => user.username === username);
    if (!user) {
      alert("Invalid username or password");
      return;
    }

    const isPasswordValid = atob(user.password) === password;
    if (!isPasswordValid) {
      alert("Invalid username or password");
      return;
    }

    currentUser = user;
    alert("Login successful");
  

    loadOrders();
  });

//addproduct
document
  .getElementById("addProductForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const name = document.getElementById("productName").value;
    const description = document.getElementById("productDescription").value;
    const price = parseFloat(document.getElementById("productPrice").value);
    const image = document.getElementById("productImage").value;

    const newProduct = { name, description, price, image };

    await fetch(`${apiUrl}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newProduct),
    });

    alert("Product added successfully");
    loadProducts();
  });

//displayproducts
async function loadProducts() {
  const response = await fetch(`${apiUrl}/products`);
  const products = await response.json();

  const productsContainer = document.querySelector(".product-list");
  productsContainer.innerHTML = "";

  products.forEach((product) => {
    const productElement = document.createElement("div");
    productElement.classList.add("product");
    productElement.innerHTML = `
            <img src="${product.image}" alt="${
      product.name
    }" class="product-image">
            <div class="product-details">
              <h3>${product.name}</h3>
              <p>${product.description}</p>
              <span>$${product.price.toFixed(2)}</span>
            </div>
            <button onclick="addToCart('${product.id}')">Add to Cart</button>
            `;

    productsContainer.appendChild(productElement);
  });
}

document.addEventListener("DOMContentLoaded", loadProducts);

//add2cart
async function addToCart(productId) {
  if (!currentUser) {
    alert("You need to log in to add items to the cart.");
    return;
  }

  const response = await fetch(`${apiUrl}/products/${productId}`);
  const product = await response.json();

  const cartResponse = await fetch(`${apiUrl}/cart`);
  const cart = await cartResponse.json();

  const existingProductIndex = cart.findIndex((item) => item.id === productId);
  if (existingProductIndex > -1) {
    cart[existingProductIndex].quantity += 1;
    await fetch(`${apiUrl}/cart/${cart[existingProductIndex].id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cart[existingProductIndex]),
    });
  } else {
    const cartItem = { ...product, quantity: 1, userId: currentUser.id };
    await fetch(`${apiUrl}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cartItem),
    });
  }
  displayCart();
}

//displaycart
async function displayCart() {
  const response = await fetch(`${apiUrl}/cart`);
  const cart = await response.json();

  let html = "";
  let totalPrice = 0;

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;
    html += `
            <tr>
                <td><img src="${item.image}" alt="${
      item.name
    }" style="width: 50px; height: 50px;"></td>
                <td>${item.name}</td>
                <td>${item.description}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td><input type="number" value="${
                  item.quantity
                }" min="1" data-id="${item.id}" class="quantity-input"></td>
                <td>$${itemTotal.toFixed(2)}</td>
                <td><button class="remove-btn" data-id="${
                  item.id
                }">Remove</button></td>
            </tr>
        `;
  });

  cartTableBody.innerHTML = html;
  cartTotalElement.innerHTML = `<h3>Total Price: $${totalPrice.toFixed(
    2
  )}</h3>`;

  const quantityInputs = document.querySelectorAll(".quantity-input");
  quantityInputs.forEach((input) => {
    input.addEventListener("change", updateQuantity);
  });

  const removeButtons = document.querySelectorAll(".remove-btn");
  removeButtons.forEach((button) => {
    button.addEventListener("click", removeFromCart);
  });
}

//updatecartquantity
async function updateQuantity(event) {
  const input = event.target;
  const productId = input.getAttribute("data-id");
  const newQuantity = parseInt(input.value);

  if (newQuantity <= 0) {
    removeFromCart(event);
  } else {
    const response = await fetch(`${apiUrl}/cart/${productId}`);
    const product = await response.json();
    product.quantity = newQuantity;

    await fetch(`${apiUrl}/cart/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    displayCart();
  }
}

//removefromcart
async function removeFromCart(event) {
  const button = event.target;
  const productId = button.getAttribute("data-id");

  await fetch(`${apiUrl}/cart/${productId}`, {
    method: "DELETE",
  });

  displayCart();
}

//ordering
btnCheckout.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You need to log in to place an order.");
    return;
  }

  const cartResponse = await fetch(`${apiUrl}/cart`);
  const cart = await cartResponse.json();

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const order = {
    userId: currentUser.id,
    date: new Date().toISOString(),
    products: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };

  await fetch(`${apiUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  //clearcartafterorder
  await Promise.all(
    cart.map((item) =>
      fetch(`${apiUrl}/cart/${item.id}`, {
        method: "DELETE",
      })
    )
  );

  alert("Order placed successfully!");
  displayCart();
  loadOrders();
});

//loadorders
async function loadOrders() {
  if (!currentUser) {
    return;
  }

  const response = await fetch(`${apiUrl}/orders`);
  const orders = await response.json();

  const userOrders = orders.filter((order) => order.userId === currentUser.id);
  const ordersTableBody = document.querySelector("#ordersTable tbody");
  ordersTableBody.innerHTML = "";

  userOrders.forEach((order) => {
    const orderElement = document.createElement("tr");
    orderElement.innerHTML = `
            <td>${order.id}</td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td>${order.products.map((item) => item.name).join(", ")}</td>
            <td>$${order.total.toFixed(2)}</td>
        `;
    ordersTableBody.appendChild(orderElement);
  });
}

btnContinueShopping.addEventListener("click", () => {
  alert("Continuing shopping...");
});

document.addEventListener("DOMContentLoaded", () => {
  displayCart();
  if (currentUser) {
    loadOrders();
  }
});
