// Generated from goyacc.g4 by ANTLR 4.9.1
// jshint ignore: start
import antlr4 from 'antlr4';
import goyaccListener from './goyaccListener.js';

const serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786",
    "\u5964\u0003\u0016`\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004",
    "\t\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007",
    "\u0004\b\t\b\u0003\u0002\u0003\u0002\u0003\u0002\u0003\u0002\u0003\u0003",
    "\u0007\u0003\u0016\n\u0003\f\u0003\u000e\u0003\u0019\u000b\u0003\u0003",
    "\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0006",
    "\u0004!\n\u0004\r\u0004\u000e\u0004\"\u0003\u0004\u0003\u0004\u0006",
    "\u0004\'\n\u0004\r\u0004\u000e\u0004(\u0003\u0004\u0003\u0004\u0006",
    "\u0004-\n\u0004\r\u0004\u000e\u0004.\u0003\u0004\u0003\u0004\u0006\u0004",
    "3\n\u0004\r\u0004\u000e\u00044\u0003\u0004\u0003\u0004\u0006\u00049",
    "\n\u0004\r\u0004\u000e\u0004:\u0003\u0004\u0003\u0004\u0006\u0004?\n",
    "\u0004\r\u0004\u000e\u0004@\u0005\u0004C\n\u0004\u0003\u0005\u0007\u0005",
    "F\n\u0005\f\u0005\u000e\u0005I\u000b\u0005\u0003\u0006\u0003\u0006\u0003",
    "\u0006\u0003\u0006\u0003\u0007\u0003\u0007\u0003\u0007\u0003\u0007\u0003",
    "\u0007\u0003\u0007\u0003\u0007\u0005\u0007V\n\u0007\u0003\b\u0006\b",
    "Y\n\b\r\b\u000e\bZ\u0003\b\u0005\b^\n\b\u0003\b\u0002\u0002\t\u0002",
    "\u0004\u0006\b\n\f\u000e\u0002\u0003\u0004\u0002\u0007\u0007\u0016\u0016",
    "\u0002l\u0002\u0010\u0003\u0002\u0002\u0002\u0004\u0017\u0003\u0002",
    "\u0002\u0002\u0006B\u0003\u0002\u0002\u0002\bG\u0003\u0002\u0002\u0002",
    "\nJ\u0003\u0002\u0002\u0002\fU\u0003\u0002\u0002\u0002\u000e]\u0003",
    "\u0002\u0002\u0002\u0010\u0011\u0005\u0004\u0003\u0002\u0011\u0012\u0007",
    "\u000f\u0002\u0002\u0012\u0013\u0005\b\u0005\u0002\u0013\u0003\u0003",
    "\u0002\u0002\u0002\u0014\u0016\u0005\u0006\u0004\u0002\u0015\u0014\u0003",
    "\u0002\u0002\u0002\u0016\u0019\u0003\u0002\u0002\u0002\u0017\u0015\u0003",
    "\u0002\u0002\u0002\u0017\u0018\u0003\u0002\u0002\u0002\u0018\u0005\u0003",
    "\u0002\u0002\u0002\u0019\u0017\u0003\u0002\u0002\u0002\u001aC\u0007",
    "\u0005\u0002\u0002\u001bC\u0007\u0006\u0002\u0002\u001cC\u0007\u0003",
    "\u0002\u0002\u001dC\u0007\u0004\u0002\u0002\u001e \u0007\t\u0002\u0002",
    "\u001f!\u0007\u0016\u0002\u0002 \u001f\u0003\u0002\u0002\u0002!\"\u0003",
    "\u0002\u0002\u0002\" \u0003\u0002\u0002\u0002\"#\u0003\u0002\u0002\u0002",
    "#C\u0003\u0002\u0002\u0002$&\u0007\n\u0002\u0002%\'\u0007\u0016\u0002",
    "\u0002&%\u0003\u0002\u0002\u0002\'(\u0003\u0002\u0002\u0002(&\u0003",
    "\u0002\u0002\u0002()\u0003\u0002\u0002\u0002)C\u0003\u0002\u0002\u0002",
    "*,\u0007\u000b\u0002\u0002+-\u0007\u0016\u0002\u0002,+\u0003\u0002\u0002",
    "\u0002-.\u0003\u0002\u0002\u0002.,\u0003\u0002\u0002\u0002./\u0003\u0002",
    "\u0002\u0002/C\u0003\u0002\u0002\u000202\u0007\f\u0002\u000213\u0007",
    "\u0016\u0002\u000221\u0003\u0002\u0002\u000234\u0003\u0002\u0002\u0002",
    "42\u0003\u0002\u0002\u000245\u0003\u0002\u0002\u00025C\u0003\u0002\u0002",
    "\u000268\u0007\r\u0002\u000279\u0007\u0016\u0002\u000287\u0003\u0002",
    "\u0002\u00029:\u0003\u0002\u0002\u0002:8\u0003\u0002\u0002\u0002:;\u0003",
    "\u0002\u0002\u0002;C\u0003\u0002\u0002\u0002<>\u0007\u000e\u0002\u0002",
    "=?\u0007\u0016\u0002\u0002>=\u0003\u0002\u0002\u0002?@\u0003\u0002\u0002",
    "\u0002@>\u0003\u0002\u0002\u0002@A\u0003\u0002\u0002\u0002AC\u0003\u0002",
    "\u0002\u0002B\u001a\u0003\u0002\u0002\u0002B\u001b\u0003\u0002\u0002",
    "\u0002B\u001c\u0003\u0002\u0002\u0002B\u001d\u0003\u0002\u0002\u0002",
    "B\u001e\u0003\u0002\u0002\u0002B$\u0003\u0002\u0002\u0002B*\u0003\u0002",
    "\u0002\u0002B0\u0003\u0002\u0002\u0002B6\u0003\u0002\u0002\u0002B<\u0003",
    "\u0002\u0002\u0002C\u0007\u0003\u0002\u0002\u0002DF\u0005\n\u0006\u0002",
    "ED\u0003\u0002\u0002\u0002FI\u0003\u0002\u0002\u0002GE\u0003\u0002\u0002",
    "\u0002GH\u0003\u0002\u0002\u0002H\t\u0003\u0002\u0002\u0002IG\u0003",
    "\u0002\u0002\u0002JK\u0007\u0016\u0002\u0002KL\u0007\u0012\u0002\u0002",
    "LM\u0005\f\u0007\u0002M\u000b\u0003\u0002\u0002\u0002NO\u0005\u000e",
    "\b\u0002OP\u0007\u0013\u0002\u0002PV\u0003\u0002\u0002\u0002QR\u0005",
    "\u000e\b\u0002RS\u0007\u0015\u0002\u0002ST\u0005\f\u0007\u0002TV\u0003",
    "\u0002\u0002\u0002UN\u0003\u0002\u0002\u0002UQ\u0003\u0002\u0002\u0002",
    "V\r\u0003\u0002\u0002\u0002WY\t\u0002\u0002\u0002XW\u0003\u0002\u0002",
    "\u0002YZ\u0003\u0002\u0002\u0002ZX\u0003\u0002\u0002\u0002Z[\u0003\u0002",
    "\u0002\u0002[^\u0003\u0002\u0002\u0002\\^\u0003\u0002\u0002\u0002]X",
    "\u0003\u0002\u0002\u0002]\\\u0003\u0002\u0002\u0002^\u000f\u0003\u0002",
    "\u0002\u0002\u000e\u0017\"(.4:@BGUZ]"].join("");


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.PredictionContextCache();

export default class goyaccParser extends antlr4.Parser {

    static grammarFileName = "goyacc.g4";
    static literalNames = [ null, null, null, null, null, null, null, "'%token'", 
                            "'%left'", "'%right'", "'%nonassoc'", "'%type'", 
                            "'%start'", "'%%'", "'{'", "'}'", "':'", "';'", 
                            "','", "'|'" ];
    static symbolicNames = [ null, "MultiLineComment", "SingleLineComment", 
                             "CodeSection", "UnionSection", "CodeBlock", 
                             "WhiteSpace", "TokenDef", "Left", "Right", 
                             "Nonassoc", "Type", "Start", "GrammarStart", 
                             "OpenBrace", "CloseBrace", "Colon", "SemiColon", 
                             "Comma", "Bar", "Word" ];
    static ruleNames = [ "file", "header", "headerElement", "parser_body", 
                         "parser_rule", "def", "production" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = goyaccParser.ruleNames;
        this.literalNames = goyaccParser.literalNames;
        this.symbolicNames = goyaccParser.symbolicNames;
    }

    get atn() {
        return atn;
    }



	file() {
	    let localctx = new FileContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, goyaccParser.RULE_file);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 14;
	        this.header();
	        this.state = 15;
	        this.match(goyaccParser.GrammarStart);
	        this.state = 16;
	        this.parser_body();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	header() {
	    let localctx = new HeaderContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, goyaccParser.RULE_header);
	    var _la = 0; // Token type
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 21;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << goyaccParser.MultiLineComment) | (1 << goyaccParser.SingleLineComment) | (1 << goyaccParser.CodeSection) | (1 << goyaccParser.UnionSection) | (1 << goyaccParser.TokenDef) | (1 << goyaccParser.Left) | (1 << goyaccParser.Right) | (1 << goyaccParser.Nonassoc) | (1 << goyaccParser.Type) | (1 << goyaccParser.Start))) !== 0)) {
	            this.state = 18;
	            this.headerElement();
	            this.state = 23;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	headerElement() {
	    let localctx = new HeaderElementContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, goyaccParser.RULE_headerElement);
	    var _la = 0; // Token type
	    try {
	        this.state = 64;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case goyaccParser.CodeSection:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 24;
	            this.match(goyaccParser.CodeSection);
	            break;
	        case goyaccParser.UnionSection:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 25;
	            this.match(goyaccParser.UnionSection);
	            break;
	        case goyaccParser.MultiLineComment:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 26;
	            this.match(goyaccParser.MultiLineComment);
	            break;
	        case goyaccParser.SingleLineComment:
	            this.enterOuterAlt(localctx, 4);
	            this.state = 27;
	            this.match(goyaccParser.SingleLineComment);
	            break;
	        case goyaccParser.TokenDef:
	            this.enterOuterAlt(localctx, 5);
	            this.state = 28;
	            this.match(goyaccParser.TokenDef);
	            this.state = 30; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 29;
	                this.match(goyaccParser.Word);
	                this.state = 32; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        case goyaccParser.Left:
	            this.enterOuterAlt(localctx, 6);
	            this.state = 34;
	            this.match(goyaccParser.Left);
	            this.state = 36; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 35;
	                this.match(goyaccParser.Word);
	                this.state = 38; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        case goyaccParser.Right:
	            this.enterOuterAlt(localctx, 7);
	            this.state = 40;
	            this.match(goyaccParser.Right);
	            this.state = 42; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 41;
	                this.match(goyaccParser.Word);
	                this.state = 44; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        case goyaccParser.Nonassoc:
	            this.enterOuterAlt(localctx, 8);
	            this.state = 46;
	            this.match(goyaccParser.Nonassoc);
	            this.state = 48; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 47;
	                this.match(goyaccParser.Word);
	                this.state = 50; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        case goyaccParser.Type:
	            this.enterOuterAlt(localctx, 9);
	            this.state = 52;
	            this.match(goyaccParser.Type);
	            this.state = 54; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 53;
	                this.match(goyaccParser.Word);
	                this.state = 56; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        case goyaccParser.Start:
	            this.enterOuterAlt(localctx, 10);
	            this.state = 58;
	            this.match(goyaccParser.Start);
	            this.state = 60; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 59;
	                this.match(goyaccParser.Word);
	                this.state = 62; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.Word);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	parser_body() {
	    let localctx = new Parser_bodyContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, goyaccParser.RULE_parser_body);
	    var _la = 0; // Token type
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 69;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===goyaccParser.Word) {
	            this.state = 66;
	            this.parser_rule();
	            this.state = 71;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	parser_rule() {
	    let localctx = new Parser_ruleContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, goyaccParser.RULE_parser_rule);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 72;
	        this.match(goyaccParser.Word);
	        this.state = 73;
	        this.match(goyaccParser.Colon);
	        this.state = 74;
	        this.def();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	def() {
	    let localctx = new DefContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, goyaccParser.RULE_def);
	    try {
	        this.state = 83;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,9,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 76;
	            this.production();
	            this.state = 77;
	            this.match(goyaccParser.SemiColon);
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 79;
	            this.production();
	            this.state = 80;
	            this.match(goyaccParser.Bar);
	            this.state = 81;
	            this.def();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	production() {
	    let localctx = new ProductionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, goyaccParser.RULE_production);
	    var _la = 0; // Token type
	    try {
	        this.state = 91;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case goyaccParser.CodeBlock:
	        case goyaccParser.Word:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 86; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            do {
	                this.state = 85;
	                _la = this._input.LA(1);
	                if(!(_la===goyaccParser.CodeBlock || _la===goyaccParser.Word)) {
	                this._errHandler.recoverInline(this);
	                }
	                else {
	                	this._errHandler.reportMatch(this);
	                    this.consume();
	                }
	                this.state = 88; 
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            } while(_la===goyaccParser.CodeBlock || _la===goyaccParser.Word);
	            break;
	        case goyaccParser.SemiColon:
	        case goyaccParser.Bar:
	            this.enterOuterAlt(localctx, 2);

	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

goyaccParser.EOF = antlr4.Token.EOF;
goyaccParser.MultiLineComment = 1;
goyaccParser.SingleLineComment = 2;
goyaccParser.CodeSection = 3;
goyaccParser.UnionSection = 4;
goyaccParser.CodeBlock = 5;
goyaccParser.WhiteSpace = 6;
goyaccParser.TokenDef = 7;
goyaccParser.Left = 8;
goyaccParser.Right = 9;
goyaccParser.Nonassoc = 10;
goyaccParser.Type = 11;
goyaccParser.Start = 12;
goyaccParser.GrammarStart = 13;
goyaccParser.OpenBrace = 14;
goyaccParser.CloseBrace = 15;
goyaccParser.Colon = 16;
goyaccParser.SemiColon = 17;
goyaccParser.Comma = 18;
goyaccParser.Bar = 19;
goyaccParser.Word = 20;

goyaccParser.RULE_file = 0;
goyaccParser.RULE_header = 1;
goyaccParser.RULE_headerElement = 2;
goyaccParser.RULE_parser_body = 3;
goyaccParser.RULE_parser_rule = 4;
goyaccParser.RULE_def = 5;
goyaccParser.RULE_production = 6;

class FileContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_file;
    }

	header() {
	    return this.getTypedRuleContext(HeaderContext,0);
	};

	GrammarStart() {
	    return this.getToken(goyaccParser.GrammarStart, 0);
	};

	parser_body() {
	    return this.getTypedRuleContext(Parser_bodyContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterFile(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitFile(this);
		}
	}


}



class HeaderContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_header;
    }

	headerElement = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(HeaderElementContext);
	    } else {
	        return this.getTypedRuleContext(HeaderElementContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterHeader(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitHeader(this);
		}
	}


}



class HeaderElementContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_headerElement;
    }

	CodeSection() {
	    return this.getToken(goyaccParser.CodeSection, 0);
	};

	UnionSection() {
	    return this.getToken(goyaccParser.UnionSection, 0);
	};

	MultiLineComment() {
	    return this.getToken(goyaccParser.MultiLineComment, 0);
	};

	SingleLineComment() {
	    return this.getToken(goyaccParser.SingleLineComment, 0);
	};

	TokenDef() {
	    return this.getToken(goyaccParser.TokenDef, 0);
	};

	Word = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(goyaccParser.Word);
	    } else {
	        return this.getToken(goyaccParser.Word, i);
	    }
	};


	Left() {
	    return this.getToken(goyaccParser.Left, 0);
	};

	Right() {
	    return this.getToken(goyaccParser.Right, 0);
	};

	Nonassoc() {
	    return this.getToken(goyaccParser.Nonassoc, 0);
	};

	Type() {
	    return this.getToken(goyaccParser.Type, 0);
	};

	Start() {
	    return this.getToken(goyaccParser.Start, 0);
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterHeaderElement(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitHeaderElement(this);
		}
	}


}



class Parser_bodyContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_parser_body;
    }

	parser_rule = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(Parser_ruleContext);
	    } else {
	        return this.getTypedRuleContext(Parser_ruleContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterParser_body(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitParser_body(this);
		}
	}


}



class Parser_ruleContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_parser_rule;
    }

	Word() {
	    return this.getToken(goyaccParser.Word, 0);
	};

	Colon() {
	    return this.getToken(goyaccParser.Colon, 0);
	};

	def() {
	    return this.getTypedRuleContext(DefContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterParser_rule(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitParser_rule(this);
		}
	}


}



class DefContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_def;
    }

	production() {
	    return this.getTypedRuleContext(ProductionContext,0);
	};

	SemiColon() {
	    return this.getToken(goyaccParser.SemiColon, 0);
	};

	Bar() {
	    return this.getToken(goyaccParser.Bar, 0);
	};

	def() {
	    return this.getTypedRuleContext(DefContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterDef(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitDef(this);
		}
	}


}



class ProductionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = goyaccParser.RULE_production;
    }

	Word = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(goyaccParser.Word);
	    } else {
	        return this.getToken(goyaccParser.Word, i);
	    }
	};


	CodeBlock = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(goyaccParser.CodeBlock);
	    } else {
	        return this.getToken(goyaccParser.CodeBlock, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.enterProduction(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof goyaccListener ) {
	        listener.exitProduction(this);
		}
	}


}




goyaccParser.FileContext = FileContext; 
goyaccParser.HeaderContext = HeaderContext; 
goyaccParser.HeaderElementContext = HeaderElementContext; 
goyaccParser.Parser_bodyContext = Parser_bodyContext; 
goyaccParser.Parser_ruleContext = Parser_ruleContext; 
goyaccParser.DefContext = DefContext; 
goyaccParser.ProductionContext = ProductionContext; 
