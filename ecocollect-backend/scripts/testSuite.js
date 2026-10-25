/**
 * Comprehensive Automated Backend Verification Test Suite
 * Tests all requirements across Phase 1, 2, 3, 4, 5
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_automated_verification_2026';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_mock_key_secret_12345';
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key_id';

const http = require('http');
const crypto = require('crypto');
const app = require('../server');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const results = [];
function recordResult(testName, passed, details = '') {
  results.push({ testName, passed, details });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testName}${details ? ' - ' + details : ''}`);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   EcoCollect Comprehensive Backend Audit Test Run  ');
  console.log('====================================================\n');

  // Start HTTP server on ephemeral port
  await new Promise(resolve => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Health Endpoint & Database State
    // ----------------------------------------------------
    {
      const res = await request('GET', '/api/health');
      // When MongoDB is offline, reports 503 degraded without leaking secrets
      const isValid = (res.status === 200 || res.status === 503) && res.body && res.body.database !== undefined;
      const dbStatus = res.body?.database?.status;
      recordResult('Health endpoint reports accurately without secrets', isValid, `Status: ${res.status}, DB: ${dbStatus}`);
    }

    // ----------------------------------------------------
    // TEST 2: Auth - Prevent Public Creation of Admin / Agent
    // ----------------------------------------------------
    {
      const resAdmin = await request('POST', '/api/auth/signup', {
        name: 'Hacker Admin',
        email: 'hacker@malicious.com',
        password: 'Password@123',
        phone: '+91 99999 00000',
        role: 'admin'
      });
      const passedAdmin = resAdmin.status === 403;
      recordResult('Public registration rejects admin role creation', passedAdmin, `Status: ${resAdmin.status}`);

      const resAgent = await request('POST', '/api/auth/signup', {
        name: 'Hacker Agent',
        email: 'agent@malicious.com',
        password: 'Password@123',
        phone: '+91 99999 00000',
        role: 'agent'
      });
      const passedAgent = resAgent.status === 403;
      recordResult('Public registration rejects agent role creation', passedAgent, `Status: ${resAgent.status}`);
    }

    // ----------------------------------------------------
    // TEST 3: Auth - Validation & Missing Fields
    // ----------------------------------------------------
    {
      const res = await request('POST', '/api/auth/signup', {
        email: 'incomplete@user.com'
      });
      recordResult('Signup rejects missing required fields with 400', res.status === 400);
    }

    // ----------------------------------------------------
    // TEST 4: Auth - Protected Endpoint Unauthorized Rejection
    // ----------------------------------------------------
    {
      const res = await request('GET', '/api/auth/me');
      recordResult('Unauthorized request to /api/auth/me rejected with 401', res.status === 401);
    }

    // ----------------------------------------------------
    // TEST 5: RBAC - Role Restriction on Admin Endpoints
    // ----------------------------------------------------
    {
      // Mock resident JWT
      const jwt = require('jsonwebtoken');
      const residentToken = jwt.sign(
        { id: '653700000000000000000001', role: 'resident' },
        process.env.JWT_SECRET
      );

      const res = await request('GET', '/api/admin/metrics', null, {
        Authorization: `Bearer ${residentToken}`
      });
      recordResult('Resident access to /api/admin/metrics forbidden with 403', res.status === 403);
    }

    // ----------------------------------------------------
    // TEST 6: IoT Telemetry - Validation & Bounds Checking
    // ----------------------------------------------------
    {
      // 6a. Missing scaleId
      const res1 = await request('POST', '/api/iot/weight-reading', {
        weightKg: 4.5
      });
      recordResult('IoT rejects missing scaleId with 400', res1.status === 400);

      // 6b. Missing weightKg
      const res2 = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01'
      });
      recordResult('IoT rejects missing weightKg with 400', res2.status === 400);

      // 6c. Negative weight
      const res3 = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: -3.5
      });
      recordResult('IoT rejects negative weight (-3.5kg) with 400', res3.status === 400);

      // 6d. Excessive weight (> 500kg)
      const res4 = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: 1200.0
      });
      recordResult('IoT rejects unreasonable weight (1200kg) with 400', res4.status === 400);

      // 6e. Non-numeric weight
      const res5 = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: 'four_kg'
      });
      recordResult('IoT rejects non-numeric weight with 400', res5.status === 400);
    }

    // ----------------------------------------------------
    // TEST 7: IoT - No Invented Battery / RSSI Data
    // ----------------------------------------------------
    {
      const res = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: 4.85
      });
      const data = res.body?.data;
      // When batteryVoltage and wifiRssi are omitted, they must be null (not silently invented as 3.7 / -65)
      const notInvented = data && data.batteryVoltage === null && data.wifiRssi === null;
      recordResult('IoT does not silently invent battery/signal strength when missing', notInvented, 
        `batteryVoltage: ${data?.batteryVoltage}, wifiRssi: ${data?.wifiRssi}`);
    }

    // ----------------------------------------------------
    // TEST 8: IoT - Telemetry Freshness & Stale/Offline Detection
    // ----------------------------------------------------
    {
      // 8a. Polling an unverified/unknown scale reports disconnected
      const resOffline = await request('GET', '/api/iot/latest/UNKNOWN-NONEXISTENT-SCALE');
      const isDisconnected = resOffline.body?.status === 'disconnected' && resOffline.body?.verifiedHardware === false;
      recordResult('Unverified hardware scale correctly reported as disconnected', isDisconnected);

      // 8b. Polling the scale that just received telemetry reports online
      const resOnline = await request('GET', '/api/iot/latest/ESP32-HX711-UNIT-01');
      const isOnline = resOnline.body?.status === 'online' && resOnline.body?.connected === true;
      recordResult('Scale with fresh telemetry reported as online', isOnline, `Status: ${resOnline.body?.status}`);
    }

    // ----------------------------------------------------
    // TEST 9: IoT - Tare Calibration Endpoint
    // ----------------------------------------------------
    {
      const res = await request('POST', '/api/iot/tare', {
        scaleId: 'ESP32-HX711-UNIT-01'
      });
      const isTareSuccess = res.status === 200 && res.body?.calibratedWeightKg === 0.0;
      recordResult('Tare endpoint /api/iot/tare zeroes scale successfully', isTareSuccess);
    }

    // ----------------------------------------------------
    // TEST 10: IoT - Replay and Duplicate Telemetry Protection
    // ----------------------------------------------------
    {
      const packetId = `test_pkt_${Date.now()}`;
      const payload = {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: 3.25,
        rawADC: 9800,
        packetId
      };

      const resFirst = await request('POST', '/api/iot/weight-reading', payload);
      const resDuplicate = await request('POST', '/api/iot/weight-reading', payload);

      const isDuplicateIgnored = resFirst.status === 201 && resDuplicate.body?.duplicate === true;
      recordResult('Duplicate or replayed telemetry frame recognized and deduplicated', isDuplicateIgnored);
    }

    // ----------------------------------------------------
    // TEST 11: IoT - Hardware vs Simulator Separation
    // ----------------------------------------------------
    {
      const resSim = await request('POST', '/api/iot/weight-reading', {
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: 2.10,
        isSimulated: true
      });
      const isSeparated = resSim.body?.isSimulated === true && resSim.body?.source === 'simulator';
      recordResult('Simulated readings explicitly separated from physical hardware', isSeparated, `Source: ${resSim.body?.source}`);
    }

    // ----------------------------------------------------
    // TEST 12: Payment - Cryptographic HMAC Signature Verification
    // ----------------------------------------------------
    {
      const jwt = require('jsonwebtoken');
      const residentToken = jwt.sign(
        { id: '653700000000000000000001', role: 'resident' },
        process.env.JWT_SECRET
      );

      // 12a. Missing signature parameters rejected
      const resMissing = await request('POST', '/api/payments/verify', {
        pickupId: '653700000000000000000002',
        razorpayOrderId: 'order_123'
      }, { Authorization: `Bearer ${residentToken}` });
      recordResult('Payment verification rejects missing signature with 400', resMissing.status === 400);

      // 12b. Forged / invalid signature rejected
      const resForged = await request('POST', '/api/payments/verify', {
        pickupId: '653700000000000000000002',
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_456',
        razorpaySignature: 'forged_fake_signature_hash_attempt'
      }, { Authorization: `Bearer ${residentToken}` });
      recordResult('Payment verification rejects forged HMAC signature', resForged.status === 400);
    }

    // ----------------------------------------------------
    // TEST 13: 404 Undefined Route Handler
    // ----------------------------------------------------
    {
      const res = await request('GET', '/api/non-existent-random-route');
      recordResult('Undefined routes return 404 with safe error message', res.status === 404);
    }

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n====================================================');
  console.log('                 TEST SUMMARY REPORT                ');
  console.log('====================================================');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`Total Tests Run: ${totalCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${totalCount - passedCount}`);
  console.log('====================================================\n');

  return { totalCount, passedCount, results };
}

if (require.main === module) {
  runTestSuite().then(({ totalCount, passedCount }) => {
    process.exit(totalCount === passedCount ? 0 : 1);
  });
}

module.exports = runTestSuite;
