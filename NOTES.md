 - New base url: https://services.mypass.technology/MPAPI/api/v1/

 - To access a volume on fly.io:
    $ fly machine list => MACHINE_ID
    $ fly machine destroy $MACHINE_ID --force
    $ fly volumes list => VOLUME_ID
    $ fly machine run --shell --volume $VOLUME_ID:/data --region fra --command /bin/sh registry.fly.io/ticketuno:deployment-01KKGQWJXW36KW3BX6PD85EAFP

 - To test Slack webhook call:
    $ curl - X POST - H 'Content-type: application/json' --data '{"text":"Hello, World!"}' 'https://hooks.slack.com/services/***SLACK_WEBHOOK_TOKEN***'

 - To force a rsend-reminders action:
     `CRON_SECRET="(see in .env file)" && curl -f -X POST https://ticketuno.fly.dev/api/v1/internal/send-reminders -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" --silent`