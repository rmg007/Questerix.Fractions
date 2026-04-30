
import { db } from '../src/persistence/db';
import { deviceMetaRepo } from '../src/persistence/repositories/deviceMeta';

async function testRepo() {
  console.log('Initial meta:');
  const meta1 = await deviceMetaRepo.get();
  console.log(JSON.stringify(meta1.preferences, null, 2));

  console.log('Updating persistGranted to true...');
  await deviceMetaRepo.updatePreferences({ persistGranted: true });

  console.log('Meta after update:');
  const meta2 = await deviceMetaRepo.get();
  console.log(JSON.stringify(meta2.preferences, null, 2));
  
  if (meta2.preferences.persistGranted === true) {
    console.log('SUCCESS: persistGranted is true');
  } else {
    console.log('FAILURE: persistGranted is still false');
  }
}

testRepo().catch(console.error);
