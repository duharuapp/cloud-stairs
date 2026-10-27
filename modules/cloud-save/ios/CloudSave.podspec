Pod::Spec.new do |s|
  s.name           = 'CloudSave'
  s.version        = '1.0.0'
  s.summary        = 'Game save in iCloud key-value storage'
  s.description    = 'Game save in iCloud key-value storage'
  s.author         = ''
  s.homepage       = 'https://example.com'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
