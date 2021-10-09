const {writeFileSync, readFileSync} = require('fs');
const {execSync} = require('child_process');
const {parse} = require('path');
const {S3} = require('aws-sdk');

// This code runs only once per Lambda "cold start"
execSync(`curl https://s3.amazonaws.com/lambda-libreoffice-demo/lo.tar.gz -o /tmp/lo.tar.gz && cd /tmp && tar -xf /tmp/lo.tar.gz`);

const s3 = new S3({params: {Bucket: 'authoran-lambda-conv'}});
const convertCommand = `/tmp/instdir/program/soffice --headless --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp`;

exports.handler = async ({filename}) => {
  const {Body: inputFileBuffer} = await s3.getObject({Key: filename}).promise();
  writeFileSync(`/tmp/${filename}`, inputFileBuffer);

  execSync(`cd /tmp && ${convertCommand} ${filename}`);

  const outputFilename = `${parse(filename).name}.pdf`;
  const outputFileBuffer = readFileSync(`/tmp/${outputFilename}`);

  await s3
    .upload({
      Key: outputFilename, Body: outputFileBuffer,
      ACL: 'public-read', ContentType: 'application/pdf'
    })
    .promise();

  return `https://s3.amazonaws.com/lambda-libreoffice-demo/${outputFilename}`;
};