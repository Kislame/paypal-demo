const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
//const baseUrl = process.env.BASE_URL;

const clientId =
  'AaGUK78U7QlV2xcwsRykYuR7yfoxUd3q-_979F-aEgN8EQMnuy7LLGhmX3_EdvzVelVVpIxnn8j6gshV';
const clientSecret =
  'EHD66_9IcQtaNYVrdKPYIObK8Pup6ZS_5LM3GJFRN6F_bbTCULLyActTgcrreaC5aOlHLo5f5P5MDjeG';
// Serve the static HTML file
app.set('view engine', 'ejs');

// Function to get access token
const getToken = async () => {
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.message);
    throw new Error('Failed to get access token');
  }
};

// API route to create an order
app.post('/pay', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const accessToken = await getToken();
    //console.log('acesstoken: ', accessToken);
    const response = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            items: [
              {
                name: 'GSAP full course',
                description: 'GSAP animation course 2024',
                quantity: 1,
                unit_amount: {
                  currency_code: 'USD',
                  value: '100.00', // Update this value to the amount you want to charge
                },
              },
            ],
            amount: {
              currency_code: 'USD',
              value: '100.00', // Update this value to the amount you want to charge
              breakdown: {
                item_total: {
                  currency_code: 'USD',
                  value: '100.00',
                },
              },
            },
          },
        ],
        application_context: {
          return_url: baseUrl + '/complete-order',
          cancel_url: baseUrl + '/cancel-order',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let url = response.data.links.find((link) => link.rel === 'approve').href;
    console.log(url);
    res.redirect(url);

    // Send order data, including order ID
  } catch (error) {
    console.error(
      'Error creating order:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Serve the HTML file at the root URL

app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  console.log('testing : ', baseUrl);
  res.render('index');
});

app.get('/donate', (req, res) => {
  res.render('donate');
});
app.get('/complete-order', async (req, res) => {
  try {
    const orderID = req.query.token;

    const accessToken = await getToken();

    // Fetch the order details to check its current status
    const orderDetails = await axios.get(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (orderDetails.data.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Order is not approved yet' });
    }

    // console.log('order data', orderDetails.data);

    const response = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.send('course purchased succesfully'); // Send back the capture details
  } catch (error) {
    console.error(
      'Error capturing order:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: 'Failed to capture order' });
  }
});
app.get('/cancel-order', (req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
