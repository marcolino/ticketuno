app = '${APP_NAME}'
primary_region = 'fra'
[build]
[deploy]
  strategy = "immediate"
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']
[mounts]
  source = "${VOLUME_NAME}"
  destination = "/data"
[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024