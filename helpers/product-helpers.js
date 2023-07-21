var db = require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
module.exports = {
    doSignup: (adminData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
            if (admin) {
                response.status = false
                response.loginErr = "this email has already taken"
                resolve(response)
            } else {
                if (adminData.Code == 984697) {
                    adminData.Password = await bcrypt.hash(adminData.Password, 10)
                    db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then(() => {
                        db.get().collection(collection.ADMIN_COLLECTION).updateMany({ Email: adminData.Email }, {
                            $unset: { Code: "" }
                        })
                        response.admin = adminData
                        response.status = true
                        resolve(response)
                    })
                } else {
                    response.loginErr = "the code is incorrect"
                    resolve(response)
                }
            }
        })
    },
    doLogin: (adminData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
            if (admin) {
                bcrypt.compare(adminData.Password, admin.Password).then((result) => {
                    if (result) {
                        response.admin = admin
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
    addProduct: (product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (proId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProdectDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    editProduct: (proId, newProduct) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: new ObjectId(proId) }, {
                $set: {
                    Name: newProduct.Name,
                    Category: newProduct.Category,
                    Price: newProduct.Price,
                    Description: newProduct.Description
                }
            }).then(() => {
                resolve()
            })
        })
    }
}