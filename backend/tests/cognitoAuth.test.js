import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cognitoLogin,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendCode,
  mapCognitoError,
  setCognitoClient,
} from '../src/services/cognitoAuth.js';
import { config } from '../src/config/env.js';

// Setup test configuration
config.cognito.clientId = 'test-client-id-12345';
config.cognito.userPoolId = 'us-east-1_testPool';
config.cognito.issuer = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testPool';

test('Cognito Auth: cognitoSignUp creates user and handles verification requirement', async () => {
  const mockClient = {
    send: async (command) => {
      assert.equal(command.input.ClientId, 'test-client-id-12345');
      assert.equal(command.input.Username, 'newdev@example.com');
      assert.equal(command.input.Password, 'StrongP@ss123');

      return {
        UserSub: 'sub-uuid-1111-2222',
        UserConfirmed: false,
        CodeDeliveryDetails: {
          Destination: 'n***@example.com',
          DeliveryMedium: 'EMAIL',
        },
      };
    },
  };

  setCognitoClient(mockClient);

  const result = await cognitoSignUp({
    email: 'newdev@example.com',
    password: 'StrongP@ss123',
    name: 'New Developer',
  });

  assert.equal(result.userSub, 'sub-uuid-1111-2222');
  assert.equal(result.userConfirmed, false);
  assert.equal(result.email, 'newdev@example.com');
  assert.ok(result.message.includes('Verification code sent'));
});

test('Cognito Auth: cognitoSignUp handles existing username exception', async () => {
  const mockClient = {
    send: async () => {
      const err = new Error('User already exists');
      err.name = 'UsernameExistsException';
      throw err;
    },
  };

  setCognitoClient(mockClient);

  await assert.rejects(
    async () => {
      await cognitoSignUp({
        email: 'existing@example.com',
        password: 'StrongP@ss123',
        name: 'Existing Dev',
      });
    },
    (err) => {
      const mapped = mapCognitoError(err);
      assert.equal(mapped.statusCode, 409);
      assert.equal(mapped.code, 'USER_EXISTS');
      return true;
    }
  );
});

test('Cognito Auth: cognitoConfirmSignUp verifies confirmation code', async () => {
  let confirmed = false;
  const mockClient = {
    send: async (command) => {
      assert.equal(command.input.Username, 'user@example.com');
      assert.equal(command.input.ConfirmationCode, '654321');
      confirmed = true;
      return {};
    },
  };

  setCognitoClient(mockClient);

  const result = await cognitoConfirmSignUp({
    email: 'user@example.com',
    code: '654321',
  });

  assert.equal(confirmed, true);
  assert.equal(result.success, true);
});

test('Cognito Auth: cognitoConfirmSignUp handles expired or invalid codes', async () => {
  const mockClient = {
    send: async () => {
      const err = new Error('Invalid code');
      err.name = 'CodeMismatchException';
      throw err;
    },
  };

  setCognitoClient(mockClient);

  await assert.rejects(
    async () => {
      await cognitoConfirmSignUp({
        email: 'user@example.com',
        code: '000000',
      });
    },
    (err) => {
      const mapped = mapCognitoError(err);
      assert.equal(mapped.statusCode, 400);
      assert.equal(mapped.code, 'CODE_MISMATCH');
      return true;
    }
  );
});

test('Cognito Auth: cognitoLogin authenticates credentials and returns session compatible with frontend', async () => {
  const fakeAccessToken = 'fake.access.token';
  const fakeIdToken = 'fake.id.token';

  const mockClient = {
    send: async (command) => {
      assert.equal(command.input.AuthFlow, 'USER_PASSWORD_AUTH');
      assert.equal(command.input.ClientId, 'test-client-id-12345');
      assert.equal(command.input.AuthParameters.USERNAME, 'developer@example.com');
      assert.equal(command.input.AuthParameters.PASSWORD, 'CorrectPass123!');

      return {
        AuthenticationResult: {
          AccessToken: fakeAccessToken,
          IdToken: fakeIdToken,
          RefreshToken: 'fake.refresh.token',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      };
    },
  };

  setCognitoClient(mockClient);

  const session = await cognitoLogin({
    email: 'developer@example.com',
    password: 'CorrectPass123!',
  });

  assert.equal(session.token, fakeAccessToken);
  assert.equal(session.accessToken, fakeAccessToken);
  assert.equal(session.idToken, fakeIdToken);
  assert.equal(session.refreshToken, 'fake.refresh.token');
  assert.equal(session.user.email, 'developer@example.com');
  assert.equal(session.user.isDemoUser, false);
});

test('Cognito Auth: cognitoLogin handles invalid credentials without disclosing account existence', async () => {
  const mockClient = {
    send: async () => {
      const err = new Error('Incorrect username or password.');
      err.name = 'NotAuthorizedException';
      throw err;
    },
  };

  setCognitoClient(mockClient);

  await assert.rejects(
    async () => {
      await cognitoLogin({
        email: 'developer@example.com',
        password: 'WrongPassword',
      });
    },
    (err) => {
      const mapped = mapCognitoError(err);
      assert.equal(mapped.statusCode, 401);
      assert.equal(mapped.code, 'INVALID_CREDENTIALS');
      assert.equal(mapped.message, 'Incorrect email or password.');
      return true;
    }
  );
});

test('Cognito Auth: cognitoLogin handles unconfirmed user error safely', async () => {
  const mockClient = {
    send: async () => {
      const err = new Error('User is not confirmed.');
      err.name = 'UserNotConfirmedException';
      throw err;
    },
  };

  setCognitoClient(mockClient);

  await assert.rejects(
    async () => {
      await cognitoLogin({
        email: 'unconfirmed@example.com',
        password: 'ValidPassword123!',
      });
    },
    (err) => {
      const mapped = mapCognitoError(err);
      assert.equal(mapped.statusCode, 403);
      assert.equal(mapped.code, 'USER_NOT_CONFIRMED');
      return true;
    }
  );
});

test('Cognito Auth: mapCognitoError maps rate limits and server errors safely', () => {
  const rateLimitErr = new Error('Rate exceeded');
  rateLimitErr.name = 'TooManyRequestsException';
  const mappedRate = mapCognitoError(rateLimitErr);
  assert.equal(mappedRate.statusCode, 429);
  assert.equal(mappedRate.code, 'RATE_LIMIT_EXCEEDED');

  const genericErr = new Error('Internal AWS error');
  const mappedGeneric = mapCognitoError(genericErr);
  assert.equal(mappedGeneric.statusCode, 500);
  assert.equal(mappedGeneric.code, 'AUTH_ERROR');
});
