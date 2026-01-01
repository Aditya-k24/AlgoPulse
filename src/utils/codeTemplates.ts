import { Language } from '../models/Problem';

export interface CodeTemplateOptions {
  functionName?: string;
  hasInput?: boolean;
  hasOutput?: boolean;
  inputType?: string;
  outputType?: string;
}

/**
 * Wraps a solution function in a complete executable program
 */
export function wrapSolutionInTemplate(
  language: Language,
  solutionCode: string,
  options: CodeTemplateOptions = {}
): string {
  const {
    functionName = 'solve',
    hasInput = true,
    hasOutput = true,
    inputType = 'string',
    outputType = 'string',
  } = options;

  switch (language) {
    case 'python':
      return wrapPythonSolution(solutionCode, functionName, hasInput);
    
    case 'java':
      return wrapJavaSolution(solutionCode, functionName, hasInput);
    
    case 'cpp':
      return wrapCppSolution(solutionCode, functionName, hasInput);
    
    default:
      return solutionCode;
  }
}

function wrapPythonSolution(solutionCode: string, functionName: string, hasInput: boolean): string {
  // Check if solution already has main execution code
  if (solutionCode.includes('if __name__') || solutionCode.includes('def main')) {
    return solutionCode;
  }

  // Check if solution has a solve function
  const hasSolveFunction = solutionCode.includes('def solve(');
  
  if (hasSolveFunction) {
    // Solution has solve function, just add main execution
    return `${solutionCode}

# Main execution - DO NOT MODIFY
if __name__ == "__main__":
    import sys
    input_data = sys.stdin.read().strip()
    result = solve(input_data)
    print(result)
`;
  } else {
    // Solution doesn't have solve function, create skeleton
    return `def solve(input_data):
    """
    TODO: Implement your solution here
    
    Args:
        input_data: The input as a string. Parse it as needed.
    
    Returns:
        The result as a string (will be printed)
    """
    ${solutionCode.split('\n').map(line => `    ${line}`).join('\n')}
    result = ""
    return result

# Main execution - DO NOT MODIFY
if __name__ == "__main__":
    import sys
    input_data = sys.stdin.read().strip()
    result = solve(input_data)
    print(result)
`;
  }
}

function wrapJavaSolution(solutionCode: string, functionName: string, hasInput: boolean): string {
  // Check if solution already has main method
  if (solutionCode.includes('public static void main')) {
    return solutionCode;
  }

  // Check if solution has a class and solve method
  const hasClass = solutionCode.includes('class ');
  const hasSolveMethod = solutionCode.includes('public static String solve(');
  
  if (hasClass && hasSolveMethod) {
    // Solution has class with solve method, just add main
    return `${solutionCode}
    
    // Main execution - DO NOT MODIFY
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (scanner.hasNextLine()) {
            input.append(scanner.nextLine());
            if (scanner.hasNextLine()) {
                input.append("\\n");
            }
        }
        String inputData = input.toString();
        String result = solve(inputData);
        System.out.println(result);
        scanner.close();
    }
`;
  } else {
    // Solution doesn't have solve method, create skeleton
    return `import java.util.*;
import java.io.*;

public class Solution {
    // TODO: Implement your solution here
    public static String solve(String inputData) {
        // Your solution logic here
        String result = "";
        return result;
    }
    
    // Main execution - DO NOT MODIFY
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (scanner.hasNextLine()) {
            input.append(scanner.nextLine());
            if (scanner.hasNextLine()) {
                input.append("\\n");
            }
        }
        String inputData = input.toString();
        String result = solve(inputData);
        System.out.println(result);
        scanner.close();
    }
}`;
  }
}

function wrapCppSolution(solutionCode: string, functionName: string, hasInput: boolean): string {
  // Check if solution already has main function
  if (solutionCode.includes('int main(') || solutionCode.includes('void main(')) {
    return solutionCode;
  }

  // Check if solution has includes and solve function
  const hasIncludes = solutionCode.includes('#include');
  const hasSolveFunction = solutionCode.includes('string solve(');
  
  const includes = hasIncludes ? '' : `#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
using namespace std;

`;
  
  if (hasSolveFunction) {
    // Solution has solve function, just add main
    return `${includes}${solutionCode}

// Main execution - DO NOT MODIFY
int main() {
    string line;
    string input;
    while (getline(cin, line)) {
        if (!input.empty()) {
            input += "\\n";
        }
        input += line;
    }
    string result = solve(input);
    cout << result << endl;
    return 0;
}`;
  } else {
    // Solution doesn't have solve function, create skeleton
    return `${includes}// TODO: Implement your solution here
string solve(string input) {
    // Your solution logic here
    string result = "";
    return result;
}

// Main execution - DO NOT MODIFY
int main() {
    string line;
    string input;
    while (getline(cin, line)) {
        if (!input.empty()) {
            input += "\\n";
        }
        input += line;
    }
    string result = solve(input);
    cout << result << endl;
    return 0;
}`;
  }
}

/**
 * Generates parsing hints based on sample input
 */
function generateParsingHints(sampleInput?: string): { hint: string; example: string } {
  if (!sampleInput) {
    return { hint: '# Parse input', example: '# lines = input_data.strip().split("\\n")' };
  }

  const lines = sampleInput.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    return { hint: '# Parse input', example: '# lines = input_data.strip().split("\\n")' };
  }

  const firstLine = lines[0].trim();
  const isNumbers = /^\d+(\s+\d+)*$/.test(firstLine);
  const isSingleNumber = /^\d+$/.test(firstLine);
  
  if (isSingleNumber) {
    return { hint: '# Parse input', example: '# n = int(input_data.strip())' };
  } else if (isNumbers) {
    const count = firstLine.split(/\s+/).length;
    if (count === 2) {
      return { hint: '# Parse input', example: '# a, b = map(int, input_data.strip().split())' };
    } else {
      return { hint: '# Parse input', example: '# arr = list(map(int, input_data.strip().split()))' };
    }
  } else if (lines.length > 1) {
    return { hint: '# Parse input', example: '# lines = input_data.strip().split("\\n")' };
  } else {
    return { hint: '# Parse input', example: '# line = input_data.strip()' };
  }
}

/**
 * Gets minimal skeleton template for a language (only the solve function)
 */
export function getBoilerplateTemplate(language: Language, problemInput?: string): string {
  const { hint, example } = generateParsingHints(problemInput);
  
  switch (language) {
    case 'python':
      return `def solve(input_data):
    ${hint}
    ${example}
    
    # Your solution logic here
    result = ""
    
    return result
`;

    case 'java':
      return `import java.util.*;
import java.io.*;

public class Solution {
    public static String solve(String inputData) {
        // ${hint.replace('#', '')}
        // String[] parts = inputData.split("\\\\n");
        
        // Your solution logic here
        String result = "";
        
        return result;
    }
}
`;

    case 'cpp':
      return `#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
using namespace std;

string solve(string input) {
    // ${hint.replace('#', '')}
    // stringstream ss(input);
    // string line;
    // getline(ss, line);
    
    // Your solution logic here
    string result = "";
    
    return result;
}
`;

    default:
      return '';
  }
}

/**
 * Gets the main execution code for a language (non-editable)
 */
export function getMainExecutionCode(language: Language): string {
  switch (language) {
    case 'python':
      return `if __name__ == "__main__":
    import sys
    input_data = sys.stdin.read().strip()
    result = solve(input_data)
    print(result)
`;

    case 'java':
      return `public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (scanner.hasNextLine()) {
            input.append(scanner.nextLine());
            if (scanner.hasNextLine()) {
                input.append("\\n");
            }
        }
        String inputData = input.toString();
        String result = solve(inputData);
        System.out.println(result);
        scanner.close();
    }`;

    case 'cpp':
      return `int main() {
    string line;
    string input;
    while (getline(cin, line)) {
        if (!input.empty()) {
            input += "\\n";
        }
        input += line;
    }
    string result = solve(input);
    cout << result << endl;
    return 0;
}
`;

    default:
      return '';
  }
}

/**
 * Extracts the core solution function from a complete program
 */
export function extractSolutionFunction(language: Language, completeCode: string): string {
  switch (language) {
    case 'python':
      // Extract everything before "if __name__"
      const pythonMainIndex = completeCode.indexOf('if __name__');
      if (pythonMainIndex !== -1) {
        return completeCode.substring(0, pythonMainIndex).trim();
      }
      return completeCode;
    
    case 'java':
      // Extract class content without main method
      const javaMainIndex = completeCode.indexOf('public static void main');
      if (javaMainIndex !== -1) {
        const beforeMain = completeCode.substring(0, javaMainIndex);
        const afterMain = completeCode.substring(javaMainIndex);
        const mainEnd = afterMain.indexOf('}');
        if (mainEnd !== -1) {
          return (beforeMain + completeCode.substring(javaMainIndex + mainEnd + 1)).trim();
        }
      }
      return completeCode;
    
    case 'cpp':
      // Extract everything before main function
      const cppMainIndex = completeCode.indexOf('int main(');
      if (cppMainIndex === -1) {
        const voidMainIndex = completeCode.indexOf('void main(');
        if (voidMainIndex !== -1) {
          return completeCode.substring(0, voidMainIndex).trim();
        }
      } else {
        return completeCode.substring(0, cppMainIndex).trim();
      }
      return completeCode;
    
    default:
      return completeCode;
  }
}
