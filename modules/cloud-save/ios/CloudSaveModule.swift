import ExpoModulesCore

// iCloud side of src/services/cloud.ts: the save in iCloud key-value storage, so progress follows the player's
// Apple ID to a new phone or a reinstall. No sign-in; it is simply empty when iCloud is off.
public class CloudSaveModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("CloudSave")

    Events("onChange")

    OnCreate {
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    // Another device's save, or the first download after a reinstall, arrives here.
    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: NSUbiquitousKeyValueStore.default,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onChange")
      }
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
    }

    // False when the phone is not signed in to iCloud (or iCloud Drive is off for the app), so nothing reaches iCloud.
    Function("isAvailable") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }

    Function("get") { (key: String) -> String? in
      NSUbiquitousKeyValueStore.default.string(forKey: key)
    }

    Function("set") { (key: String, value: String) in
      NSUbiquitousKeyValueStore.default.set(value, forKey: key)
    }
  }
}
