var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var fs = require('fs')

/* Session */

const verifyLogin = (req, res, next) => {
  if (req.session.admin) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

/* GET users listing. */

router.get('/', function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    for (i = 0; i < products.length; i++) {
        products[i].Number = i + 1
    }
    res.render('admin/view-products', { admin: true, products, adminData: req.session.admin });
  })
});

router.get('/login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  }
  else {
    res.render('admin/login', { admin: true, loginErr: req.session.loginErr, loginPage: true })
    req.session.loginErr = false
  }
})

router.post('/login', (req, res) => {
  productHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.admin.loggedIn = true
      res.redirect('/admin')
    } else {
      req.session.loginErr = "Invalid email or password"
      res.redirect('/admin/login')
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.admin = null
  res.redirect('/admin')
})

router.get('/signup', (req, res) => {
  res.render('admin/signup', { loginErr: req.session.loginErr, loginPage: true })
})

router.post('/signup', (req, res) => {
  productHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.admin.loggedIn = true
      res.redirect('/admin')
    } else {
      req.session.loginErr = response.loginErr
      res.redirect('/admin/signup')
    }
  })
})

router.get('/add-product', verifyLogin, (req, res) => {
  res.render('admin/add-product', { admin: true, adminData: req.session.admin })
})

router.post('/add-product', (req, res) => {
  let image = req.files.Image
  productHelpers.addProduct(req.body).then((id) => {
    image.mv(`./public/images/product-images/${id}.jpg`, (err) => {
      if (!err) res.redirect('/admin')
      else console.log(err);
    })
  })
})

router.get('/edit-product/', verifyLogin, (req, res) => {
  let proId = req.query.id
  productHelpers.getProdectDetails(proId).then((product) => {
    res.render('admin/edit-product', { admin: true, product, adminData: req.session.admin })
  })
})

router.post('/edit-product/', (req, res) => {
  let proId = req.body.Id
  let newProduct = req.body
  productHelpers.editProduct(proId, newProduct).then(() => {
    res.redirect('/admin')
    if (req.files) {
      let image = req.files.Image
      image.mv(`./public/images/product-images/${proId}.jpg`)
    }
  })
})

router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  productHelpers.deleteProduct(proId).then(() => {
    res.redirect('/admin')
    let imagePath = `./public/images/product-images/${proId}.jpg`
    fs.unlink(imagePath, (err) => {
      if (err) console.log(err)
    })
  })
})

module.exports = router;
