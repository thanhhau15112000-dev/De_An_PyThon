import { SePayPgClient } from 'sepay-pg-node';

const client = new SePayPgClient({
  env: 'sandbox',
  merchant_id: 'TEST_MERCHANT_ID',
  secret_key: 'TEST_SECRET_KEY'
});

const checkoutURL = client.checkout.initCheckoutUrl();

const checkoutFormfields = client.checkout.initOneTimePaymentFields({
  payment_method: 'BANK_TRANSFER',
  order_invoice_number: 'DH123',
  order_amount: 10000,
  currency: 'VND',
  order_description: 'Thanh toan don hang DH123',
  success_url: 'https://example.com/order/DH123?payment=success',
  error_url: 'https://example.com/order/DH123?payment=error',
  cancel_url: 'https://example.com/order/DH123?payment=cancel',
});

console.log("URL:", checkoutURL);
console.log("Fields:", JSON.stringify(checkoutFormfields, null, 2));
