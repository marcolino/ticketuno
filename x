const en = Object.keys(require('./shared/locales/en/common.json'));
['_zero','_one','_two','_few','_many','_other'].forEach(suffix => {
  const count = en.filter(k => k.endsWith(suffix)).length;
  if (count) console.log(suffix + ':', count);
});

