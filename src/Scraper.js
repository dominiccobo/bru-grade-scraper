const puppeteer = require('puppeteer');
const cheerio = require('cheerio');


const EVISION_URL = 'https://evision.brunel.ac.uk/urd/sits.urd/run/siw_lgn?STU';
const MY_COURSE_NAVIGATION_OPTION_SELECTOR = "a[id='STU3']";

class AutomatedResultsPageNavigator {

    constructor(username, password, browser) {
        this.username = username;
        this.password = password;
        this._browser =  browser;
    }

    async navigateToPage() {
        let page = await this._browser.newPage();
        await page.goto(EVISION_URL);
        await this.login(page, this.username, this.password);
        await page.waitForSelector(MY_COURSE_NAVIGATION_OPTION_SELECTOR);
        await this.navigateToMyCourseView(page);
        await this.navigateToResults(page);
        return await page.content();
    }

    async close() {
        await this._browser.close();
    }

    async login(page, username, password) {
        await page.type("input[id='MUA_CODE.DUMMY.MENSYS']", username, {delay: 10});
        await page.type("input[id='PASSWORD.DUMMY.MENSYS']", password, {delay: 10});
        await page.click("input[name='BP101.DUMMY_B.MENSYS']");
    };

    async navigateToMyCourseView(page) {
        await page.click(MY_COURSE_NAVIGATION_OPTION_SELECTOR);
        await page.waitForSelector("input[name='resultsbutton']");

    };

    async navigateToResults(page) {
        let navPromise = page.waitForNavigation({waitUntil: 'domcontentloaded'});
        await page.click("input[name='resultsbutton']");
        await navPromise;
    };
}

class Result {

    constructor(year, module_code, title, grade, credits, ects, fheqLevel, attempts) {
        this.year = year;
        this.module_code = module_code;
        this.title = title;
        this.grade = grade;
        this.credits = credits;
        this.fheqLevel = fheqLevel;
        this.attempts = attempts;
        this.gradeInfo = Grade.forGrade(grade)
    }

    isCore() {
        return this.title.includes('(CORE)')
    }
}

class PageParser {

    constructor(html) {
        this.html = html;
        this.domParser = cheerio.load(this.html);
    }

    parseResultsFromTableRow(element) {
        let elementsByTagName = this.domParser("td", element);
        let module_results = Array.from(elementsByTagName, v => this.domParser(v).text());
        return new Result(
            this._getYearFromTableRow(module_results),
            this._getModuleCodeFromTableRow(module_results),
            this._getTitleFromTableRow(module_results),
            this._getGradeFromTableRow(module_results),
            this._getCreditsFromTableRow(module_results),
            this._getECTSFromTableRow(module_results),
            this._getFHEQLevelFromTableRow(module_results),
            this._getAttemptsFromTableRow(module_results)
        );
    }

    _getAttemptsFromTableRow(module_results) {
        return module_results[7];
    }

    _getFHEQLevelFromTableRow(module_results) {
        return module_results[6];
    }

    _getECTSFromTableRow(module_results) {
        return module_results[5];
    }

    _getCreditsFromTableRow(module_results) {
        return module_results[4];
    }

    _getGradeFromTableRow(module_results) {
        return module_results[3];
    }

    _getTitleFromTableRow(module_results) {
        return module_results[2];
    }

    _getModuleCodeFromTableRow(module_results) {
        return module_results[1];
    }

    _getYearFromTableRow(module_results) {
        return module_results[0];
    }

    parsePage() {
        let assessments = this.domParser('#assessments>tbody>tr', this.html);
        let modules = this.domParser('#modular>tbody>tr', this.html);

        assessments = this.cleanupAssessmentsResultsExcessMeta(assessments);
        modules = this.cleanupModuleResultsExcessMeta(modules);

        let assessmentResults = this.parseAssessmentResults(assessments);
        let moduleResults = this.parseModuleResults(modules);

        return assessmentResults.concat(moduleResults);
    };

    parseModuleResults(modules) {
        let localResults = [];
        modules.each((index, element) => {
            localResults.push(this.parseResultsFromTableRow(element));
        });
        return localResults;
    }

    parseAssessmentResults(assessments) {
        let localResults = [];
        assessments.each((index, element) => {
            localResults.push(this.parseResultsFromTableRow(element));
        });
        return localResults;
    }

    cleanupAssessmentsResultsExcessMeta(assessments) {
        return assessments.filter((index, element) => {
            return index > 0 && element.children.length === 8;
        });
    }

    cleanupModuleResultsExcessMeta(modules) {
        return modules.filter((index, element) => {
            let cleanedUp = this.domParser('td', element);
            return cleanedUp.length === 8;
        });
    }
}

class Grade {
    // TODO: externalise to file or scrape directly ... or is this too many moving parts.
    static gradeMappings = {
        "A*": {
            "low": 90,
            "high": 100,
            "degreeClass": "1",
            "gradePoint": 17
        },
        "A+": {
            "low": 80,
            "high": 89,
            "degreeClass": "1",
            "gradePoint": 16
        },
        "A": {
            "low": 73,
            "high": 79,
            "degreeClass": "1",
            "gradePoint": 15
        },
        "A-": {
            "low": 70,
            "high": 72,
            "degreeClass": "1",
            "gradePoint": 14
        },
        "B+": {
            "low": 68,
            "high": 69,
            "degreeClass": "2.1",
            "gradePoint": 13
        },
        "B": {
            "low": 63,
            "high": 67,
            "degreeClass": "2.1",
            "gradePoint": 12
        },
        "B-": {
            "low": 60,
            "high": 62,
            "degreeClass": "2.1",
            "gradePoint": 11
        },
        "C+": {
            "low": 58,
            "high": 59,
            "degreeClass": "2.2",
            "gradePoint": 10
        },
        "C": {
            "low": 53,
            "high": 57,
            "degreeClass": "2.2",
            "gradePoint": 9
        },
        "C-": {
            "low": 50,
            "high": 52,
            "degreeClass": "2.2",
            "gradePoint": 8
        },
        "D+": {
            "low": 48,
            "high": 49,
            "degreeClass": "3",
            "gradePoint": 7
        },
        "D": {
            "low": 43,
            "high": 47,
            "degreeClass": "3",
            "gradePoint": 6
        },
        "D-": {
            "low": 40,
            "high": 42,
            "degreeClass": "3",
            "gradePoint": 5
        },
        "E+": {
            "low": 38,
            "high": 39,
            "degreeClass": "Fail",
            "gradePoint": 4
        },
        "E": {
            "low": 33,
            "high": 37,
            "degreeClass": "Fail",
            "gradePoint": 3
        },
        "E-": {
            "low": 30,
            "high": 32,
            "degreeClass": "Fail",
            "gradePoint": 2
        },
        "F": {
            "low": 0,
            "high": 29,
            "degreeClass": "Fail",
            "gradePoint": 1
        }
    };

    constructor(low, high, degreeClass, grade, gradePoint) {
        this.low = low;
        this.high = high;
        this.degreeClass = degreeClass;
        this.grade = grade;
        this.gradePoint = gradePoint;
    }

    static forGrade(grade) {
        grade = grade.trim();
        return new Grade(
            Grade.gradeMappings[grade]['low'],
            Grade.gradeMappings[grade]['high'],
            Grade.gradeMappings[grade]['degreeClass'],
            grade,
            Grade.gradeMappings[grade]['gradePoint']
        );
    }
}

module.exports = {
    scraper: async function scraper(username, password) {

        const browser = await puppeteer.launch({headless: true});
        const navigator = new AutomatedResultsPageNavigator(username, password, browser);
        const html = await navigator.navigateToPage();
        const pageParser = new PageParser(html);
        let results = pageParser.parsePage();

        const level_weighting = {
            '5': '1/3',
            '6': '2/3'
        };

        results = results.filter((value, index) => {
            return Number(value.fheqLevel) !== 3;
        });

        browser.close();
        return results;
    }
};
