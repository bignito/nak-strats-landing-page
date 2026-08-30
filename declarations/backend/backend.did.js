export const idlFactory = ({ IDL }) => {
  const http_header = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const http_request_result = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(http_header),
  });
  const TransformationInput = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : http_request_result,
  });
  const TransformationOutput = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(http_header),
  });
  return IDL.Service({
    'getDashboardData' : IDL.Func([], [IDL.Text], []),
    'getNAKPrice' : IDL.Func([], [IDL.Text], []),
    'getTokenImage' : IDL.Func([IDL.Text, IDL.Text], [IDL.Text], []),
    'getTokenProfile' : IDL.Func([IDL.Text, IDL.Text], [IDL.Text], []),
    'getTreasuryTokens' : IDL.Func([], [IDL.Text], []),
    'transform' : IDL.Func(
        [TransformationInput],
        [TransformationOutput],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
