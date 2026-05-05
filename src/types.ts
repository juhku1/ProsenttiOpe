export type TokenType = 'number' | 'operator' | 'fraction' | 'variable';

export interface FractionToken {
  type: 'fraction';
  numerator: number | string | null;
  denominator: number | string | null;
  selectedSlot?: 'numerator' | 'denominator' | null;
}

export interface NumberToken {
  type: 'number';
  value: number;
}

export interface OperatorToken {
  type: 'operator';
  value: '*' | '/' | '+' | '-' | '(' | ')' | '=';
}

export interface VariableToken {
  type: 'variable';
  value: string;
}

export type Token = FractionToken | NumberToken | OperatorToken | VariableToken;

export type TaskType = 
  | 'percentage_of' 
  | 'percentage_share' 
  | 'percentage_change' 
  | 'new_value' 
  | 'reverse_percentage' 
  | 'base_value';

export interface Task {
  id: string;
  type: TaskType;
  text: string;
  knownValues: Record<string, number>;
  tokens: Token[];
  solution: string; // Used for validation check
  explanation: string;
}
