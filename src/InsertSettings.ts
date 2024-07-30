export type NumberParts = [-1 | 1, string, string];
export interface InsertSettings {
	format: string;
	start: NumberParts;
	step: NumberParts;
	signed: boolean;
	super_align: boolean;
	super_align_frac: boolean;
	int_width: number;
	precision: number | null;
	zfill: string;
	separator: string;
	separator_interval: number;
}
