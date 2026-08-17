export const UsersController = {
  list: () => [],
  findOne: ({ params }: { params: { id: string } }) => ({ id: params.id }),
  create: ({ body }: { body: unknown }) => body,
  remove: ({ params }: { params: { id: string } }) => ({ id: params.id, deleted: true }),
};
