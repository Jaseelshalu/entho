function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: "get",
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                if (count === '') count = parseInt(0)
                count = parseInt(count) + 1
                $("#cart-count").html(count)
            } else {
                location.href = '/login'
            }
        }
    })
}

function changeQuantity(cartId, proId, count, proName, userId) {
    let quantity = parseInt(document.getElementById(proId).innerHTML)
    count = parseInt(count)
    if (count == 0) {
        if (confirm(`Are you want to remove ${proName} from cart ?`)) {
            $.ajax({
                url: '/change-product-quantity',
                method: 'post',
                data: {
                    userId: userId,
                    cartId: cartId,
                    proId: proId,
                    count: count,
                    quantity: quantity
                },
                success: (response) => {
                    document.getElementById(proId).parentNode.parentNode.remove()
                    if ($('.table tbody').children().length === 0) {
                        $('.container').remove()
                        $('.text-center').show()
                    }
                    $('#total').text(response.total)
                }
            })
        }
    } else {
        $.ajax({
            url: '/change-product-quantity',
            method: 'post',
            data: {
                userId: userId,
                cartId: cartId,
                proId: proId,
                count: count,
                quantity: quantity
            },
            success: (response) => {
                document.getElementById(proId).innerHTML = quantity + count
                $('#total').text(response.total)
                if (response.success) {
                    $('#' + proId).siblings('#space').show()
                    $('#' + proId).siblings('#minus').hide()
                } else {
                    $('#' + proId).siblings('#space').hide()
                    $('#' + proId).siblings('#minus').show()
                }
            }
        })
    }
}

$('#checkout-form').submit((event) => {
    event.preventDefault()
    $.ajax({
        url: '/place-order',
        method: 'post',
        data: $('#checkout-form').serialize(),
        success: (response) => {
            if (response.codSuccess) location.href = '/order-success'
            else razorpayPayment(response)
        }
    })
})

function razorpayPayment(order) {
    var options = {
        "key": "rzp_test_KO8ZorTizYRi2t", // Enter the Key ID generated from the Dashboard
        "amount": "50000", // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        "currency": "INR",
        "name": order.amount, //your business name
        "description": "Test Transaction",
        "image": "https://example.com/your_logo",
        "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        "handler": function (response) {
            // alert(response.razorpay_payment_id);
            // alert(response.razorpay_order_id);
            // alert(response.razorpay_signature)

            verifyPayment(response, order)
        },
        "prefill": {
            "name": "Gaurav Kumar", //your customer's name
            "email": "gaurav.kumar@example.com",
            "contact": "9000090000"
        },
        "notes": {
            "address": "Razorpay Corporate Office"
        },
        "theme": {
            "color": "#3399cc"
        }
    }
    var rzp1 = new Razorpay(options);
    rzp1.open()
}

function verifyPayment(payment, order) {
    $.ajax({
        url: '/verify-payment',
        method: 'post',
        data: {
            payment,
            order
        },
        success: (response) => {
            if (response.status) {
                location.href = '/order-success'
            } else {
                alert('Payment failed')
            }
        }
    })
}

$(document).ready(function () {
    $('#productsTable').DataTable();
});