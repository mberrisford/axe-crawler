/**
 * @fileOverview Generate output reports from axe-crawler data
 * @name output.js
 * @author Tyler Collins
 * @license MIT
 */

import fs from 'fs';
import marked from 'marked';
import escape from 'escape-html';

import logger from './logger';

export function outputToJSON(file, reports) {
  const formattedJSON = JSON.stringify(reports, null, 2);
  fs.writeFile(file, formattedJSON);
}

/**
 * buildHTMLReports - function to generate html version of JSON report
 *
 * @param {object} reports
 */
export function outputToHTML(file, reports) {
  let head = '<!doctype html> <html lang="en"><head>';
  head += `<title>aXe Accessibility Engine Report ${new Date().toDateString()}</title>`;
  head += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  head += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.8.0/github-markdown.css">';
  head += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">';
  head += '<style> h1 { text-align: center; } ol > li { padding-bottom: 15px; font-weight: 500 } ul > li { font-weight: 400; font-size: 12px; } ol > li > span { font-weight: 400; }</style>';

  let body = '</head><body><div class="container"><div class="row"><div class="col-xs-12">';
  body += marked(`# aXe Accessibility Engine Report ${new Date().toDateString()}`);
  body += `${marked('This report is not a complete accessibility audit.  This report only documents those accessibility features tested by the axe-core library, and should not be considered exhaustive of the possible accessibility issues a website may have.  Use this report as a tool in a complete and comprehensive process of reviewing this site for accessibility issues.  More information regarding the features tested by the axe-core library may be found at [axe-core.org](https://axe-core.org/)')}</div></div>`;
  body += '<div class="row"><div class="col-xs-12">';

  function countResults(report, type) {
    return Object.entries(report[type]).reduce((sum, [viewName, result]) => sum + result.length, 0);
  }

  function writeNodeMessages(list, {
    html, any, all, none,
  }) {
  /* eslint-disable no-param-reassign */
    list += `<li>${escape(html)}`;
    any.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    all.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    none.forEach(({ message }) => {
      list += `<br />${escape(message)}`;
    });
    list += '</li>';
    return list;
  /* eslint-enable no-param-reassign */
  }

  function printViewCounts(report, reportType) {
    body += '<ul>';
    Object.entries(report[reportType]).forEach(([view, results]) => {
      body += `<li style="list-style: none; height: 15px;"><div class="col-xs-2">${view}:</div><div class="col-xs-10"> ${results.length} ${reportType}</div></li>`;
    });
    body += '</ul>';
  }

  try {
    body += `${marked(`## Summary of Violations: ${
      Object.entries(reports).reduce((total, [url, report]) => total + countResults(report, 'violations'), 0)} total violations`)}</div></div>`;
  } catch (err) {
    logger.error('Error counting violated tests: ', err);
    body += marked('## Summary of Violations');
  }
  body += '<div class="row"><div class="col-xs-12">';

  function listTestResults([view, results]) {
    if (results.length > 0) {
      const list = `<span>${view.toUpperCase()}</span><br/><ol>${results.reduce((item, {
        description,
        nodes,
        impact,
      }) => {
        item += `<li>${impact ? `${impact.toUpperCase()}: ` : ''}${escape(description)}<br />`;
        item += '<span>Affected Nodes: </span><ul>';
        item += nodes.reduce(writeNodeMessages, '');
        return item += '</ul></li>';
      }, '')}`;
      body += `${list}</ol>`;
    }
  }

  Object.entries(reports).forEach(([url, report]) => {
    const violationCount = countResults(report, 'violations');
    body += marked(`### ${escape(url)} ${violationCount} violations`);
    printViewCounts(report, 'violations');
    body += '<br/>';
    Object.entries(report.violations).forEach(listTestResults, '');
  });


  try {
    body += `${marked(`## Summary of Passing Tests: ${
      Object.entries(reports).reduce((total, [url, report]) => total + countResults(report, 'passes'), 0)} total passing tests`)}</div></div>`;
  } catch (err) {
    logger.error('Error counting passed tests: ', err);
    body += marked('## Summary of Passing Tests');
  }

  Object.entries(reports).forEach(([url, report]) => {
    const passesCount = countResults(report, 'passes');
    body += marked(`### ${escape(url)} ${passesCount} passes`);
    printViewCounts(report, 'passes');
    body += '<br />';
    Object.entries(report.passes).forEach(listTestResults, '');
  });

  body += '</div></div>';

  const foot = '</body><script></script></html>';

  fs.writeFile(file, head + body + foot);
}
