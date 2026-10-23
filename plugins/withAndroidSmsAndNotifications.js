const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for Home CashFlow
 * Configures AndroidManifest with permissions & background services for:
 * 1. Google Messages (RCS & SMS via NotificationListenerService)
 * 2. Truecaller (SMS & Verified notifications)
 * 3. Carrier Provider (Telephony SMS Content Provider & BroadcastReceiver)
 */
const withAndroidSmsAndNotifications = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Ensure Permissions Array
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    for (const perm of requiredPermissions) {
      const exists = androidManifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === perm
      );
      if (!exists) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // 2. Ensure Application section exists
    if (!androidManifest.application || !androidManifest.application[0]) {
      return config;
    }

    const app = androidManifest.application[0];

    // 3. Register SmsBroadcastReceiver for cellular SMS
    if (!app.receiver) {
      app.receiver = [];
    }

    // Clean any legacy unqualified receiver
    app.receiver = app.receiver.filter(
      (r) => !r.$ || r.$['android:name'] !== '.sms.SmsBroadcastReceiver'
    );

    const receiverName = 'expo.modules.smssync.SmsBroadcastReceiver';
    const hasSmsReceiver = app.receiver.some(
      (r) => r.$ && r.$['android:name'] === receiverName
    );

    if (!hasSmsReceiver) {
      app.receiver.push({
        $: {
          'android:name': receiverName,
          'android:enabled': 'true',
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
          },
        ],
      });
    }

    // 4. Register NotificationListenerService for Google Messages RCS, Truecaller, and Bank Apps
    if (!app.service) {
      app.service = [];
    }

    // Clean any legacy unqualified service
    app.service = app.service.filter(
      (s) => !s.$ || s.$['android:name'] !== '.sms.CashflowNotificationListenerService'
    );

    const serviceName = 'expo.modules.smssync.CashflowNotificationListenerService';
    const hasNotifService = app.service.some(
      (s) => s.$ && s.$['android:name'] === serviceName
    );

    if (!hasNotifService) {
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:label': 'Home CashFlow Bank Alert Sync',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withAndroidSmsAndNotifications;
