/**
 * Configuração global do aplicativo
 * Gerencia os perfis para o 3º perfil gratuito (onde ninguém se segue):
 * - Se quem pesquisa for mulher (2 perfis femininos e 1 masculino): perfil masculino @vitor_ma0
 * - Se quem pesquisa for homem (2 perfis femininos e 1 masculino): perfil feminino @lella_silv
 */
export const APP_CONFIG = {
  // @ do perfil masculino para quando quem pesquisa for mulher
  thirdProfileMaleHandle: 'vitor_ma0',

  // @ do perfil feminino para quando quem pesquisa for homem
  thirdProfileFemaleHandle: 'lella_silv',

  /**
   * Retorna o handle correto para o 3º perfil dependendo do gênero pesquisado
   */
  getThirdProfileHandle(targetUserGender: 'female' | 'male'): string {
    return targetUserGender === 'female' ? this.thirdProfileMaleHandle : this.thirdProfileFemaleHandle;
  },
};
