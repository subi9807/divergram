require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'DivergramApplePay'
  s.version        = package['version']
  s.summary        = 'PassKit bridge for Divergram resort booking deposits.'
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'METAbyTREE'
  s.homepage       = 'https://divergram.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PassKit'
  s.source_files = '**/*.{h,m,swift}'
end
