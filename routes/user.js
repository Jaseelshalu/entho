var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var userHelpers = require('../helpers/user-helpers');

/* Session */

const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */

router.get('/', async function (req, res, next) {
  let cartCount = null;
  let orderCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    orderCount = await userHelpers.getOrderProducts(req.session.user._id)
    orderCount = orderCount.length
    if (cartCount === 0) cartCount = null
    if (orderCount === 0) orderCount = null
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { products, user: req.session.user, cartCount, orderCount });
  });
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  }
  else {
    res.render('user/login', { loginErr: req.session.loginErr, loginPage: true })
    req.session.loginErr = false
  }
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    } else {
      req.session.loginErr = "Invalid email or password"
      res.redirect('/login')
    }
  })
})

router.get('/cart-login', (req, res) => {
  res.render('user/login', { loginErr: req.session.loginErr, cartLogin: true, loginPage: true })
  req.session.loginErr = false
  req.session.cart = true
})

router.post('/cart-login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/cart')
    } else {
      req.session.loginErr = "Invalid email or password"
      res.redirect('/cart-login')
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.user = null
  res.redirect('/')
})

router.get('/signup', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  }
  else {
    res.render('user/signup', { loginErr: req.session.loginErr, loginPage: true })
    req.session.loginErr = false
  }
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      if (req.session.cart) {
        req.session.cart = false; res.redirect('/cart')
      }
      else res.redirect('/')
    } else {
      req.session.loginErr = "this email has already taken"
      res.redirect('/signup')
    }
  })
})

router.get('/cart', async (req, res) => {
  if (req.session.user) {
    let items = false
    let total = null
    let products = await userHelpers.getCartProducts(req.session.user._id)
    if (products) {
      items = true
      total = await userHelpers.getTotalAmount(req.session.user._id)
      for (let i = 0; i < products.length; i++) {
        if (products[i].quantity > 1) products[i].ys = true
      }
    }
    let orderCount = null; orderCount = await userHelpers.getOrderProducts(req.session.user._id); orderCount = orderCount.length; if (orderCount === 0) orderCount = null
    res.render('user/cart', { products, items, user: req.session.user, total, orderCount })
  } else {
    res.redirect('/cart-login')
  }
})

router.get('/add-to-cart/:id', (req, res) => {
  if (req.session.user) {
    userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    })
  } else {
    res.json({ status: false })
  }
})

router.post('/change-product-quantity', (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId)
    res.json(response)
  })
})

router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let orderCount = null; orderCount = await userHelpers.getOrderProducts(req.session.user._id); orderCount = orderCount.length; if (orderCount === 0) orderCount = null
  res.render('user/place-order', { total, user: req.session.user, orderCount })
})

router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductsList(req.body.userId)
  let total = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, total).then((orderId) => {
    if (req.body['payment-method'] === 'ONLINE') {
      userHelpers.generateRazorpay(orderId, total).then((response) => {
        res.json(response)
      })
    }
    else res.json({ codSuccess: true })
  })
})

router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('Payment successfull');
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false })
  })
})

router.get('/order-success', verifyLogin, async (req, res) => {
  let orderCount = null; orderCount = await userHelpers.getOrderProducts(req.session.user._id); orderCount = orderCount.length; if (orderCount === 0) orderCount = null
  res.render('user/order-success', { user: req.session.user, orderCount })
})

router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getOrderProducts(req.session.user._id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  if (cartCount === 0) cartCount = null
  res.render('user/orders', { user: req.session.user, orders, cartCount })
})

router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  let orderDetails = await userHelpers.getOrderProductDetails(req.params.id)
  res.render('user/view-order-products', { user: req.session.user, orderDetails })
})

module.exports = router;
