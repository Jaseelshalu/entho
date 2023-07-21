var db = require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')

const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_KO8ZorTizYRi2t',
    key_secret: '7DUOarTZ195rEwP9kFey1fjG',
});

module.exports = {
    doSignup: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                response.status = false
                resolve(response)
            } else {
                userData.Password = await bcrypt.hash(userData.Password, 10)
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then(() => {
                    response.user = userData
                    response.status = true
                    resolve(response)
                })
            }
        })
    },
    doLogin: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((result) => {
                    if (result) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let prObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) }).then((userCart) => {
                if (userCart) {
                    let proExist = userCart.products.findIndex(product => product.item == proId)
                    if (proExist != -1) {
                        db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                    } else {
                        db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) }, {
                            $push: {
                                products: prObj
                            }
                        }).then(() => {
                            resolve()
                        })
                    }
                } else {
                    let cartObject = {
                        user: new ObjectId(userId),
                        products: [prObj]
                    }
                    db.get().collection(collection.CART_COLLECTION).insertOne(cartObject).then(() => {
                        resolve()
                    })
                }
            })
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartExist = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            let cartItems = false
            if (cartExist) {
                if (cartExist.products[0]) {
                    cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate(
                        [
                            {
                                $match: { user: new ObjectId(userId) }
                            },
                            {
                                $unwind: '$products'
                            },
                            {
                                $project: {
                                    item: '$products.item',
                                    quantity: '$products.quantity'
                                }
                            },
                            {
                                $lookup: {
                                    from: collection.PRODUCT_COLLECTION,
                                    localField: 'item',
                                    foreignField: '_id',
                                    as: 'cartItems'
                                }
                            },
                            {
                                $project: {
                                    item: 1, quantity: 1, product: { $arrayElemAt: ['$cartItems', 0] }
                                }
                            }
                            // {
                            //     $lookup: {
                            //         from: collection.PRODUCT_COLLECTION,
                            //         let: { prodList: '$products' },
                            //         pipeline: [
                            //             {
                            //                 $match: {
                            //                     $expr: {
                            //                         $in: ['$_id', '$$prodList']
                            //                     }
                            //                 }
                            //             }
                            //         ],
                            //         as: 'cartItems'
                            //     }
                            // }
                        ]
                    ).toArray()
                    resolve(cartItems)
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }
        })
    },
    getCartCount: (userId) => {
        let count = 0
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart) {
                for (let i = 0; i < cart.products.length; i++) {
                    count += cart.products[i].quantity
                }
            }
            resolve(count)
        })
    },
    changeProductQuantity: (data) => {
        data.count = parseInt(data.count)
        data.quantity = parseInt(data.quantity)
        return new Promise((resolve, reject) => {
            if (data.count == 0) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(data.cartId), 'products.item': new ObjectId(data.proId) },
                    {
                        $pull: { products: { item: new ObjectId(data.proId) } }
                    }
                ).then(() => {
                    resolve({ status: true })
                })
            } else if (data.quantity == 2 && data.count == -1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(data.cartId), 'products.item': new ObjectId(data.proId) },
                    {
                        $inc: { 'products.$.quantity': data.count }
                    }
                ).then(() => {
                    resolve({ success: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(data.cartId), 'products.item': new ObjectId(data.proId) },
                    {
                        $inc: { 'products.$.quantity': data.count }
                    }
                ).then(() => {
                    resolve({ status: true })
                })
            }
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartExist = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cartExist) {
                if (cartExist.products[0]) {
                    total = await db.get().collection(collection.CART_COLLECTION).aggregate(
                        [
                            {
                                $match: { user: new ObjectId(userId) }
                            },
                            {
                                $unwind: '$products'
                            },
                            {
                                $project: {
                                    item: '$products.item',
                                    quantity: '$products.quantity'
                                }
                            },
                            {
                                $lookup: {
                                    from: collection.PRODUCT_COLLECTION,
                                    localField: 'item',
                                    foreignField: '_id',
                                    as: 'cartItems'
                                }
                            },
                            {
                                $project: {
                                    item: 1, quantity: 1, product: { $arrayElemAt: ['$cartItems', 0] }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalSum: { $sum: { $multiply: [{ $toInt: '$product.Price' }, '$quantity'] } }
                                }
                            }
                        ]
                    ).toArray()
                    resolve(total[0].totalSum)
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }
        })
    },
    placeOrder: (orderData, products, total) => {
        return new Promise(async (resolve, reject) => {
            let status = orderData['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                address: {
                    address: orderData.address,
                    pincode: orderData.pincode,
                    mobile: orderData.mobile
                },
                userId: orderData.userId,
                paymentMethod: orderData['payment-method'],
                products: products,
                totalAmount: total,
                date: new Date(),
                status: status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(orderData.userId) })
                resolve(response.insertedId)
            })
        })
    },
    getCartProductsList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            resolve(cart.products)
        })
    },
    getOrderProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderExist = await db.get().collection(collection.ORDER_COLLECTION).findOne({ userId: userId })
            if (orderExist) {
                let order = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: userId }).toArray()
                order.length = order.length
                resolve(order)
            } else {
                resolve(false)
            }
        })
    },
    getOrderProductDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate(
                [
                    {
                        $match: { _id: new ObjectId(orderId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'orderDetails'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$orderDetails', 0] }
                        }
                    }
                ]
            ).toArray()
            resolve(orderDetails)
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            instance.orders.create({
                amount: total * 100,
                currency: "INR",
                receipt: orderId.toString(),
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
            }, function (err, order) {
                if (err) {
                    console.log("error :", err);
                } else {
                    console.log("New Order :", order);
                    resolve(order)
                }
            })
        })
    },
    verifyPayment: (details) => {
        return new Promise(async (resolve, reject) => {
            const { createHmac } = await import('node:crypto');

            const secret = '7DUOarTZ195rEwP9kFey1fjG';
            let hash = createHmac('sha256', secret)

            hash.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hash = hash.digest('hex')

            if (hash == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new ObjectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }).then(() => {
                    resolve()
                })
        })
    }
}