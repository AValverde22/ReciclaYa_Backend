import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('expiration task does not run on import and can be started and destroyed explicitly', async () => {
    let starts = 0, destroys = 0;
    mock.module('../src/config/database.js', {defaultExport:{}});
    mock.module('../src/models/init-models.js', {defaultExport:() => ({solicitud:{}})});
    mock.module('node-cron', {defaultExport:{createTask:() => ({start:() => starts++, destroy:() => destroys++})}});
    const repository = await import('../src/repositories/solicitud.js');
    assert.equal(starts,0);
    await repository.startExpirationTask(); assert.equal(starts,1);
    await repository.stopExpirationTask(); assert.equal(destroys,1);
});
