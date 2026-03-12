New base url: https://services.mypass.technology/MPAPI/api/v1/

To access a volume on fly.io:

 $ fly machine list => MACHINE_ID
 $ fly machine destroy $MACHINE_ID --force
 $ fly volumes list => VOLUME_ID
 $ fly machine run --shell --volume $VOLUME_ID:/data --region fra --command /bin/sh registry.fly.io/ticketuno:deployment-01KKGQWJXW36KW3BX6PD85EAFP
