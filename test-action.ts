import { generateAdminDoc } from './src/ai/flows/generate-admin-docs';

async function test() {
  try {
    const res = await generateAdminDoc({
      documentType: 'Letter to Parents',
      purpose: 'Testing',
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();
