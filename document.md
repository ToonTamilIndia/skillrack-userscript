# SkillRack Program Tracker — solved / pending

> Live tracker maintained by `tools/status.py`. A problem is **SOLVED** when a
> verified `solutions/<ProgramID>.md` exists in this repo.
>
> The userscript fetches these **by ProgramID** from this repo **by default**:
> `https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/main/solutions/<id>.md`
> (GitHub raw URL — works for everyone, no server needed). For dev/testing, point
> Settings → "Solutions Base URL" at a local server, e.g. `http://localhost:3000`
> (run `node solutions-server.js`); AI is the final fallback.
>
> All solved problems are **C** (CODETUTOR pack 0, the 50 VERY-EASY / EASY sets).
> The platform has **6 levels + extras** (see the inventory table); Levels 1-4 are
> enumerated with a live session cookie (see skill.md §1), Levels 5/6/Prime are
> wallet-gated kits and expose no problem IDs in their lists.

## Current status

- **Solved (committed solution file exists):** 183
- **Enumerated with a live session cookie (`tools/.scratch/enum/`):** Level 1 C pack = 543
  unique problems; Level 2 = 5; Level 3 = 207; Level 4 = 25. **Levels 5/6/Prime are
  wallet-gated kits** — they expose only a names-only preview, so unsolved IDs must be
  captured from the `viewsolved` / solve pages rather than the kit list.
- **Pending:** see skill.md workflow. The C **Level 1** (CODETUTOR) language-pack sets
  are mostly solved; the enumerated Level 2/3/4 problems (232 total) and the Java /
  Python / C++ / SQL / DS packs are the next solve targets (`tools/enum.py <idx>`,
  pack indexes in skill.md §1).

## Language coverage

| Lang | Solutions |
|------|-----------|
| C | 183 |

## Pack / level inventory

| Level | Content | Status |
|-------|---------|--------|
| 1 — CODETUTOR | 7 language packs (C / Java / Python / C++ / SQL / DS-C / DS-Java); each pack = ~23 sub-challenges incl. INTRO, STARTER, 50 VERY-EASY, 50 EASY, 50 EASY ADD-ON, 50 AVERAGE, LAB ADD-ON; some problems are MFIB fill-in-the-blank | 🔄 C VERY-EASY/EASY sets SOLVED (183 files); rest ⏳ |
| 2 — CODETRACK lev=2 | KICKSTART for ABSOLUTE Beginner → **Recursion** sub-challenge (5 unsolved) | ⏳ 5 unsolved enumerated |
| 3 — CODETRACK lev=3 | MNC Companies (TCS/CTS/WIPRO/INFOSYS): COGNIZANT CTS - 35 PROGRAMS (10 unsolved, e.g. 6679, 6681-6689) · InfyTQ Programs (all solved) · MNC COMPANIES PROGRAMS (SET 001-020, 197 unsolved) | ⏳ 207 unsolved enumerated |
| 4 — CODETRACK lev=4 | Data Structures & Algorithms — Stack / Queue / Binary Tree / Sorting (25 unsolved) | ⏳ 25 unsolved enumerated |
| 5 — CODETRACK lev=5 | Product Companies (Higher Salary) — **wallet-gated KIT**; page shows a names-only "Programs List" preview (Step Number [ZH], Array LEADERS (ZH), …) with **no problem IDs**; scheduling needs wallet points (balance 0) | 🔒 wallet-gated — capture IDs from `viewsolved`/solve pages instead |
| 6 — CODETRACK lev=6 | Dream Product Companies (Very High Salary) + Mini Projects — **wallet-gated KIT**, names-only preview | 🔒 wallet-gated |
| Prime — CODETRACK lev=100 | Dream Companies Placement Pack — **wallet-gated KIT**, names-only preview | 🔒 wallet-gated |
| LACS — webinarcodetrack | Webinar code track | ⏳ PENDING |
| LAB — labcodeprograms | LAB programs | ⏳ PENDING |

## All solved problems (183)

| Id | Problem | Lang |
|----|---------|------|
| 1871 | Welcome Message | c |
| 1872 | Repeat the input number | c |
| 1873 | Greet by Name | c |
| 1874 | Athlete & Medals Count | c |
| 1875 | Price Precision | c |
| 1876 | Hyphen Separated Co-Primes | c |
| 1877 | Railway Time Display | c |
| 1878 | Print Country Capital GDP | c |
| 1879 | Space Separated String Input | c |
| 1880 | Employee - Name Age Salary Asterisk | c |
| 2525 | Odd Integers In Range | c |
| 2527 | Second Largest Value among N integers | c |
| 2528 | String - Remove First & Last Characters | c |
| 2531 | HCF/GCD of Two Numbers | c |
| 2533 | String Reverse | c |
| 2534 | Sum of Tenth and Unit Digits | c |
| 2567 | Prime Number | c |
| 2568 | Fibonacci Sequence | c |
| 2569 | Print String Till Character | c |
| 2570 | Uppercase Letters Count | c |
| 2571 | Top Scoring Batsman Name | c |
| 2584 | Reverse String Till Underscore | c |
| 2593 | First Repeating Character | c |
| 2604 | Arrange Alphabets - Descending Order | c |
| 2611 | Odd Length String Diagonal Pattern [ZOHO] | c |
| 2613 | String - Reverse Words [ZOHO] | c |
| 2614 | Minimum Distance Between Words [AMAZON] | c |
| 2615 | Pattern Printing - Floyd Triangle | c |
| 2616 | Tower Line of Sight Issue | c |
| 2617 | String - Count Articles | c |
| 2618 | Array Product Except Index Value [AMAZON] | c |
| 2619 | Sub Palindromes | c |
| 2620 | Message Encryption | c |
| 2621 | Series Team Score | c |
| 5409 | C - Function - Print Square | c |
| 5410 | C - Function - Print Twice the Value | c |
| 5411 | C - Function - Sum of Two Numbers | c |
| 5412 | C - Function - Product of A and B | c |
| 5413 | C - Function - Minimum of N Integers | c |
| 5414 | C - Function - Array Elements Sum | c |
| 5415 | C - Function - Odd Factors Count | c |
| 6380 | C - Function - Reverse Second Half | c |
| 6381 | C - Function - Matrix Transpose | c |
| 6382 | C - Function - Digit Sum | c |
| 6572 | Assignment Distribution | c |
| 6576 | Area of a Ground | c |
| 6582 | Table Marked Price | c |
| 6587 | Circumference of the Circle | c |
| 6588 | Simple Interest Calculation | c |
| 6589 | Precision upto 3 decimal places | c |
| 6592 | Distributed and Remaining Idlis | c |
| 6593 | Interchanged Unit Digits | c |
| 6596 | Gift  Distribution | c |
| 6597 | Certificates Remaining | c |
| 6609 | Rainbow Colours | c |
| 6610 | Arithmetic Operation - Odd or Even | c |
| 6612 | Square or Rectangle or Quadrilateral | c |
| 6614 | WaterTemperature | c |
| 6615 | Type of Processor | c |
| 6627 | Day in a Week | c |
| 6633 | Print Digit - Unit and Tenth | c |
| 6638 | Vegetable Shop | c |
| 6650 | Largest Floating Point Value | c |
| 6652 | Predict Rain | c |
| 6698 | Even or Odd Integers | c |
| 6700 | Square of N to N | c |
| 6703 | Count of Positive, Negative and Zeroes | c |
| 6705 | Cube of the Value from N to 1 | c |
| 6706 | Integers from N to 1 - Not Divisible by X | c |
| 6707 | Maximum Sum | c |
| 6710 | Print All Consonants | c |
| 6728 | Animal(s) or Bird(s) Sounds | c |
| 6735 | N Multiples of X | c |
| 6749 | Integer Pattern | c |
| 6822 | Toggle Characters at X | c |
| 6831 | Sort Two String Values | c |
| 6832 | Longest String | c |
| 6835 | Adjacent Characters | c |
| 6857 | Remove First and Last Characters | c |
| 6859 | Longest Word | c |
| 6869 | Replace Spaces in S | c |
| 6880 | Odd or Even Length of S | c |
| 6883 | String Equality Ignoring Case | c |
| 6890 | Position of Characters - X | c |
| 6917 | Negative Integers in Reverse Order | c |
| 6926 | Even Integers in Descending Order | c |
| 6929 | Sum of N Integers Except Current Integer | c |
| 6930 | Same Position Elements in Two Arrays | c |
| 6937 | Odd Position and Even Position Elements | c |
| 6949 | Sum of Array Elements | c |
| 6964 | Formatted Arithmetic Operations | c |
| 6965 | 10 Percent Discount | c |
| 6966 | Cumulative Sum of Each Integer | c |
| 6967 | Print the Character | c |
| 6968 | String with Colon | c |
| 6969 | Sum of A and B | c |
| 6970 | ASCII Value of Character | c |
| 6971 | Three Integers - Sum and Division | c |
| 6972 | Sum of Two Digit Integers | c |
| 6973 | Sum of Three Floating Point Values | c |
| 6980 | Speed Conversion | c |
| 6982 | Sum of Least Significant Bits - M and N | c |
| 6983 | Profit on Selling Tables | c |
| 6986 | Perimeter of the Square | c |
| 6987 | Distance Covered | c |
| 6988 | Time Taken to Cover Distance | c |
| 6989 | Difference Between Two Time Periods | c |
| 6990 | Discounted Amount to be Paid | c |
| 6991 | Area of Regular Pentagon | c |
| 6992 | Simple Interest | c |
| 7009 | Equal Sum | c |
| 7017 | Absolute Difference between Two Integers | c |
| 7018 | Previous Alphabet | c |
| 7019 | Swap the Digits | c |
| 7020 | Divisibility of Integers | c |
| 7022 | Unit Digit or Tenth Digit | c |
| 7023 | Valid Character | c |
| 7024 | Tenth Digit Divisiblity | c |
| 7025 | Previous and Next Alphabets | c |
| 7026 | List of Discounts | c |
| 7027 | Article - Profit or Loss | c |
| 7029 | Profit or Loss - Bike | c |
| 7030 | Product or Sum of Three Integers | c |
| 7032 | Divisible or Not | c |
| 7034 | Four Integers - Adjacent | c |
| 7036 | Alphabetical Order or Not | c |
| 7039 | Alphabet in Range | c |
| 7043 | Younger Person | c |
| 7044 | Alphabetical Position | c |
| 7045 | Except Smallest Integer | c |
| 7076 | Alphabet Integer Pattern | c |
| 7077 | Middle Character(s) | c |
| 7081 | Integer with Hyphen Pattern | c |
| 7082 | X Lines Integers Pattern | c |
| 7083 | Alphabet Pattern Printing | c |
| 7084 | Number Increment Pattern | c |
| 7085 | Pattern Printing - Alternate 1 to N | c |
| 7087 | Count of Composite Numbers | c |
| 7088 | Palindromic Integers | c |
| 7089 | Time between Two | c |
| 7090 | Cumulative Sum of Prime Integers | c |
| 7109 | Unique Digit Sum Count | c |
| 7110 | Minimum Difference - N Integers | c |
| 7111 | Contiguous Integers or Not | c |
| 7112 | Multiply with the Minimum Adjacent | c |
| 7113 | Product of Two Halves Sum | c |
| 7114 | Same Frequency | c |
| 7116 | Weight of the String | c |
| 7117 | Alphabets Digits and Symbols | c |
| 7118 | Abbreviated String | c |
| 7119 | Camel Case String | c |
| 7120 | Space(s) after Punctuation Mark(s) | c |
| 7122 | String Modification | c |
| 7123 | Lexicographically in Descending Order | c |
| 7125 | Alphabet at Index | c |
| 7126 | Same Element - Two Arrays | c |
| 7138 | N Format In Matrix | c |
| 7139 | Matrix - Rows Odd/Even | c |
| 7145 | Replace the Common Elements - Matrix | c |
| 7146 | Same Element Matrix | c |
| 7147 | Matrix - Upper Left to Lower Right | c |
| 7148 | Zeros Matrix | c |
| 7149 | Column with Most Vowels | c |
| 7151 | Diagonally Dominant or Not | c |
| 7154 | Greater Alphabet between Two Matrices | c |
| 7156 | Diagonal Constant Matrix | c |
| 7691 | Sum of Right Side Element(s) | c |
| 8442 | Even followed by Odd integers | c |
| 8443 | Largest Unit Digits Integers | c |
| 8444 | Maximum Count Integer-Even or Odd | c |
| 11865 | function addTwoIntegers | c |
| 11866 | function getVowelsCount | c |
| 11867 | function addThreeIntegers | c |
| 11868 | function getIndex | c |
| 11869 | function getOddCount | c |
| 11870 | function getCommonFactorsCount | c |
| 11871 | function getFactorsCount | c |
| 11872 | function getAlphabetsCount | c |
| 11873 | function getFactorial | c |
| 11874 | function compareLength | c |
| 13043 | File - Characters at Odd Positions | c |
| 13057 | function mergeFileContents | c |
| 13059 | function mergeTwoArrays | c |

---

## How to regenerate this tracker

- Just-scan mode:  `python3 tools/status.py`
- Full cross-check (needs an enumeration/statement json):
  `python3 tools/fetch.py <enum.json> 0 --out /tmp/sack_stmts.json`
  then `python3 tools/status.py /tmp/sack_stmts.json --md document.md`
- The `Pending` list is intentionally structural here — re-enumeration is required
  every bulk solve because SkillRack only shows unsolved problems and the list rotates.
