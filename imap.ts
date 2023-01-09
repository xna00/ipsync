import Imap from 'imap';

let imap: Imap;
export function initImap(config: Imap.Config) {
  imap = new Imap({
    ...config,
    host: 'outlook.office365.com',
    port: 993,
    tls: true
  });

};

function openConnection() {
  return new Promise<void>(res => {
    imap.connect();
    imap.once('error', function(err: any) {
      throw err;
    });

    imap.once('end', function() {
      console.log('Connection ended');
    });
    imap.once('ready', () => {
      res();
    });
  });
}

export function closeConnection() {
  return new Promise<void>(res => {
    imap.closeBox((err) => {
      if (err) throw err;
    });
    imap.end();
    res();
  });
}

function openInbox() {
  return new Promise<Imap.Box>((res) => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      res(box);
    });
  });
}



export function openConnectionAndInbox() {
  return openConnection().then(openInbox);
}

type A = { subject: string, text: string, uid: number; };
export function search(subject: string): Promise<number[]> {
  return new Promise<number[]>((resolve, _reject) => {
    imap.seq.search([['SUBJECT', subject]], (err, uids) => {
      if (err) throw err;
      resolve(uids);
    });
  });
}

export function detail(uids: number[]): Promise<A[]> {
  const ret = uids.map(uid => new Promise<A>((res) => {
    const ret: A = { subject: '', text: '', uid };

    const f = imap.seq.fetch([uid], {
      bodies: ['HEADER.FIELDS (SUBJECT)', 'TEXT'],
      struct: true
    });
    f.on('message', function(msg) {
      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          ret[info.which === 'TEXT' ? 'text' : 'subject'] = buffer.trim().replace('Subject: ip:', '');

        });
      });
    });
    f.once('error', function(err) {
      throw err;
    });
    f.once('end', function() {
      res(ret);
    });
  }));
  return Promise.all(ret);
}
export function remove(uids: number[]) {
  return new Promise<void>((resolve, _reject) => {
    if (!uids.length) {
      resolve();
      return;
    }
    imap.seq.move(uids, 'Deleted', (err) => {
      if (err) {
        throw err;
      }
      resolve();

    }
    );
  });
}

/*
openConnectionAndInbox().then(() => search('ip:')).then(res => {
  console.log(res);
  return res;
}).then(detail).then(r => (console.log(r), r))
  .then(r => remove(r.map(r => r.uid)))
  .then(closeConnection)
  */
