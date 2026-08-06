const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// react-native-firebase v26 resolves the Firebase iOS SDK through Swift Package
// Manager by default, which only ships dynamic frameworks. This project links
// static frameworks (required by the wider pod set, e.g. react-native-purchases),
// so force CocoaPods-only resolution. See @react-native-firebase/app/firebase_spm.rb.
const FLAG = '$RNFirebaseDisableSPM = true';

module.exports = function withFirebaseCocoapods(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes(FLAG)) {
        fs.writeFileSync(podfilePath, `${FLAG}\n${contents}`);
      }
      return modConfig;
    },
  ]);
};
