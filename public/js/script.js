//1.carousel
$(document).ready(function () {
    $('.carousel').carousel({
        interval: 2000
    })
});



function clickEvent(first, last) {
    if (first.value.length) {
        document.getElementById(last).focus();
    }
}


document.querySelector('button').addEventListener('click', function () {
    var otp = '';
    for (var i = 1; i <= 5; i++) {
        otp += document.getElementById('input' + i).value;
    }
    // Send the OTP to your server to verify it
    fetch('/valOtp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp: otp }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // OTP verification was successful
                console.log('OTP verification successful');
            } else {
                // OTP verification failed
                console.log('Invalid OTP');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});
