// booking.js - front-end logic (Vercel backend used for create-order & verify)
// NOTE: replace YOUR_RAZORPAY_KEY_ID below with your Razorpay Key ID (live/test).
const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_KEY_ID"; // <-- replace this

const addEventBtn = document.getElementById('addEventBtn');
const eventsContainer = document.getElementById('events');
const packageSelect = document.getElementById('packageSelect');
const advanceSelect = document.getElementById('advanceSelect');
const totalDisplay = document.getElementById('totalDisplay');
const bookingForm = document.getElementById('bookingForm');
const msg = document.getElementById('msg');

let payNowAmount = 0;
const EXTRA_PER_DATE = 1000;

addEventBtn.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'grid-2 event-row';
  row.innerHTML = `<input type="date" name="event_date[]" class="eventDate" required>
                   <input type="text" name="event_name[]" class="eventName" placeholder="Event name (e.g. Haldi)" required>`;
  eventsContainer.appendChild(row);
  calculate();
});

function calculate(){
  const eventCount = document.querySelectorAll('.eventDate').length;
  const base = Number(packageSelect.value || 0);
  const advP = Number(advanceSelect.value || 0);
  if(!base){ totalDisplay.textContent=''; payNowAmount = 0; return; }
  const gross = base + Math.max(0, eventCount-1)*EXTRA_PER_DATE;
  const payNow = advP ? Math.round(gross * advP / 100) : gross;
  payNowAmount = Number(payNow);
  totalDisplay.textContent = `Total: ₹${gross} | Pay now: ₹${payNow}`;
}

packageSelect.addEventListener('change', calculate);
advanceSelect.addEventListener('change', calculate);
eventsContainer.addEventListener('input', calculate);

function collectBookingData(form){
  const data = {};
  const formData = new FormData(form);
  for(const [k,v] of formData.entries()){
    if(k.endsWith('[]')) continue;
    if(data[k] === undefined) data[k] = v;
    else {
      if(!Array.isArray(data[k])) data[k] = [data[k]];
      data[k].push(v);
    }
  }
  // collect event pairs separately
  const dates = Array.from(document.querySelectorAll('input[name="event_date[]"]')).map(i=>i.value);
  const names = Array.from(document.querySelectorAll('input[name="event_name[]"]')).map(i=>i.value);
  const events = [];
  for(let i=0;i<dates.length;i++){ if(dates[i] && names[i]) events.push({date:dates[i], name:names[i]}); }
  data.events = events;
  data.packageAmount = Number(packageSelect.value||0);
  data.advance = Number(advanceSelect.value||0);
  return data;
}

bookingForm.addEventListener('submit', async function(e){
  e.preventDefault();
  msg.textContent = 'Creating order...';

  calculate();
  if(!payNowAmount || isNaN(payNowAmount) || payNowAmount<=0){
    msg.textContent = 'Please select package and advance %';
    return;
  }

  try{
    const orderRes = await fetch('/api/create-order', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ amount: payNowAmount, currency: 'INR' })
    });
    const order = await orderRes.json();
    if(!order.id){ msg.textContent='Order creation failed'; return; }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Mahadev Photography',
      description: 'Booking Advance',
      order_id: order.id,
      handler: async function(response){
        msg.textContent = 'Verifying payment...';
        try{
          const bookingData = collectBookingData(bookingForm);
          const verifyRes = await fetch('/api/verify', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ...response, bookingData, payNowAmount })
          });
          const result = await verifyRes.json();
          msg.textContent = result.success ? 'Payment successful! Invoice sent.' : 'Payment verification failed.';
        }catch(err){
          msg.textContent = 'Verification error: ' + err.message;
        }
      },
      theme:{color:'#3399cc'}
    };

    if(typeof Razorpay !== 'undefined'){
      new Razorpay(options).open();
    } else {
      msg.textContent = 'Payment script not loaded. Try reloading the page.';
    }

  }catch(err){
    msg.textContent = 'Error: ' + (err.message || err);
  }
});
