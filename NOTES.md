 - New base url: https://services.mypass.technology/MPAPI/api/v1/

 - To access a volume on fly.io:
    $ fly machine list => MACHINE_ID
    $ fly machine destroy $MACHINE_ID --force
    $ fly volumes list => VOLUME_ID
    $ fly machine run --shell --volume $VOLUME_ID:/data --region fra --command /bin/sh registry.fly.io/ticketuno:deployment-01KKGQWJXW36KW3BX6PD85EAFP

 - To test Slack webhook call:
    $ curl - X POST - H 'Content-type: application/json' --data '{"text":"Hello, World!"}' 'https://hooks.slack.com/services/***SLACK_WEBHOOK_TOKEN***'

 - To force a resend of booking reminders action:
     `CRON_SECRET="(see in .env file)" && curl -f -X POST https://ticketuno.fly.dev/api/v1/internal/send-booking-reminders -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" --silent`

 - Registars:
   - register.it:
     - account: log in with google oauth
     - domain: ticketuno.it (0.00€/y., used for running a local tunnel)
     - auth-info code for domain ticketuno.it: AI-36294916a52a5
     - customer code: MS274700-EU+RO