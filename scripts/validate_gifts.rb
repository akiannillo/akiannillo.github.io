#!/usr/bin/env ruby
# frozen_string_literal: true

# Validates _data/gifts.yml before it can break the gift pages.
#
# Ruby's YAML support is in the standard library and the site already needs
# Ruby for Jekyll, so this runs with no gems to install:
#
#     ruby scripts/validate_gifts.rb
#
# Exits non-zero on any error, which fails the GitHub Action.

require "yaml"
require "date"

DATA_FILE  = ENV.fetch("GIFTS_FILE", "_data/gifts.yml")
I18N_FILE  = ENV.fetch("GIFTS_I18N_FILE", "_data/gifts_i18n.yml")
STATUSES   = %w[open funded closed hidden].freeze
ID_FORMAT  = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/.freeze

errors = []
warnings = []

def number?(value)
  value.is_a?(Numeric)
end

unless File.exist?(DATA_FILE)
  warn "#{DATA_FILE}: not found"
  exit 1
end

begin
  data = YAML.safe_load(File.read(DATA_FILE), permitted_classes: [Date])
rescue Psych::SyntaxError => e
  warn "#{DATA_FILE}: not valid YAML -- #{e.message}"
  exit 1
end

errors << "top level is not a mapping" unless data.is_a?(Hash)

if data.is_a?(Hash)
  errors << "missing `currency`" if data["currency"].to_s.strip.empty?

  gifts = data["gifts"]
  if !gifts.is_a?(Array)
    errors << "`gifts` must be a list"
  elsif gifts.empty?
    warnings << "`gifts` is empty -- the page will show its empty-state message"
  else
    seen = {}

    gifts.each_with_index do |gift, index|
      where = "gifts[#{index}]"

      unless gift.is_a?(Hash)
        errors << "#{where}: not a mapping"
        next
      end

      id = gift["id"]
      where = "gift `#{id}`" if id

      if id.nil? || id.to_s.strip.empty?
        errors << "#{where}: missing `id`"
      elsif !id.to_s.match?(ID_FORMAT)
        errors << "#{where}: `id` must be a lowercase slug (letters, digits, single hyphens)"
      elsif seen.key?(id)
        errors << "#{where}: duplicate `id` (also used by gifts[#{seen[id]}])"
      else
        seen[id] = index
      end

      %w[name description].each do |field|
        errors << "#{where}: missing `#{field}`" if gift[field].to_s.strip.empty?
      end

      target = gift["target"]
      if target.nil?
        errors << "#{where}: missing `target`"
      elsif !number?(target)
        errors << "#{where}: `target` must be a number, got #{target.inspect}"
      elsif target <= 0
        errors << "#{where}: `target` must be greater than zero, got #{target}"
      end

      status = gift["status"]
      if status.nil?
        errors << "#{where}: missing `status`"
      elsif !STATUSES.include?(status.to_s)
        errors << "#{where}: `status` must be one of #{STATUSES.join(', ')}, got #{status.inspect}"
      end

      image = gift["image"]
      unless image.nil? || image.to_s.strip.empty?
        path = image.to_s.sub(%r{\A/}, "")
        errors << "#{where}: `image` #{image} does not exist at #{path}" unless File.exist?(path)
      end

      contributions = gift["contributions"]
      total = 0.0

      if contributions.nil?
        # An absent list is fine -- it simply means nobody has given yet.
      elsif !contributions.is_a?(Array)
        errors << "#{where}: `contributions` must be a list"
      else
        contributions.each_with_index do |c, ci|
          spot = "#{where} contribution[#{ci}]"

          unless c.is_a?(Hash)
            errors << "#{spot}: not a mapping"
            next
          end

          date = c["date"]
          if date.nil?
            errors << "#{spot}: missing `date`"
          elsif date.is_a?(Date)
            warnings << "#{spot}: dated in the future (#{date})" if date > Date.today
          elsif date.to_s.match?(/\A\d{4}-\d{2}-\d{2}\z/)
            begin
              Date.iso8601(date.to_s)
            rescue ArgumentError
              errors << "#{spot}: `date` #{date.inspect} is not a real date"
            end
          else
            errors << "#{spot}: `date` must be YYYY-MM-DD, got #{date.inspect}"
          end

          errors << "#{spot}: missing `name`" if c["name"].to_s.strip.empty?

          amount = c["amount"]
          if amount.nil?
            errors << "#{spot}: missing `amount`"
          elsif !number?(amount)
            errors << "#{spot}: `amount` must be a number, got #{amount.inspect}"
          elsif amount <= 0
            errors << "#{spot}: `amount` must be greater than zero, got #{amount}"
          else
            total += amount
          end

          unless [true, false].include?(c["show_name"])
            errors << "#{spot}: `show_name` must be true or false, got #{c['show_name'].inspect}"
          end
        end
      end

      # Not fatal, but the page will show a funded card while the data still
      # claims it is open -- worth knowing about.
      if number?(target) && target.positive? && total >= target && status.to_s == "open"
        warnings << "#{where}: fully funded (#{format('%.2f', total)}/#{format('%.2f', target)}) but still `status: open`"
      end
    end
  end
end

# The two language blocks must expose the same keys, or one page renders blanks.
if File.exist?(I18N_FILE)
  begin
    i18n = YAML.safe_load(File.read(I18N_FILE))
    en = i18n["en"]
    it = i18n["it"]
    if en.is_a?(Hash) && it.is_a?(Hash)
      en.each do |section, body|
        next unless body.is_a?(Hash)
        other = it[section]
        if !other.is_a?(Hash)
          errors << "#{I18N_FILE}: Italian is missing the `#{section}` section"
        else
          missing = body.keys - other.keys
          extra   = other.keys - body.keys
          errors << "#{I18N_FILE}: it.#{section} is missing #{missing.join(', ')}" unless missing.empty?
          errors << "#{I18N_FILE}: it.#{section} has unknown #{extra.join(', ')}" unless extra.empty?
        end
      end
    else
      errors << "#{I18N_FILE}: expected top-level `en` and `it` mappings"
    end
  rescue Psych::SyntaxError => e
    errors << "#{I18N_FILE}: not valid YAML -- #{e.message}"
  end
end

warnings.each { |w| puts "warning: #{w}" }

if errors.empty?
  count = data.is_a?(Hash) && data["gifts"].is_a?(Array) ? data["gifts"].size : 0
  puts "#{DATA_FILE}: OK (#{count} gift#{count == 1 ? '' : 's'}, #{warnings.size} warning#{warnings.size == 1 ? '' : 's'})"
  exit 0
end

errors.each { |e| warn "error: #{e}" }
warn "\n#{errors.size} problem#{errors.size == 1 ? '' : 's'} found in the gift data. The site was not updated."
exit 1
